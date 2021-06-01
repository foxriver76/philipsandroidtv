import wol from 'wake_on_lan';

import { get, post } from './requestHelpers';
import { prepareAuthenticationRequestPayload } from './cmds/auth';
import { createUniquePairRequestPayload } from './cmds/pair';

const validate = {
    mac: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/,
    // eslint-disable-next-line
    ip: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    pin: /^[0-9]{4}$/,
};

export interface Authentication {
    user: string;
    pass: string;
    sendImmediately: boolean;
}

export class PhilipsTVChannels {
    public channels : Channel[] = [];
    
    reloadChannels(listChannels: string) {
        const channels = JSON.parse(listChannels);

        this.channels = [];

        for (const channel of channels.Channel) {
            this.channels.push({
                ccid: channel.ccid, name: channel.name, object: channel,
            });
        }
    }

    getObjectByName(name: string) : Record<string, string> {
        for (const channel of this.channels) {
            if (channel.name === name) {
                return channel.object;
            }
        }
        return {};
    }

    getNameByCcid(ccid: string) : string {
        for (const channel of this.channels) {
            if (channel.ccid === ccid) {
                return channel.name;
            }
        }
        return '';
    }
    
    getObjectByCcid(ccid: string) : Record<string, string> {
        for (const channel of this.channels) {
            if (channel.ccid === ccid) {
                return channel.object;
            }
        }
        return {};
    }
}

export class PhilipsTV {
    private ip: string;
    private mac?: string;
    private auth?: Authentication;
    private volume?: number;
    private volumeMin = 0;
    private volumeMax = 0;
    private lastPlayPause = 'Pause';
    public tvChannels: PhilipsTVChannels;
    
    constructor(ip: string, mac?: string, auth?: Authentication) {
        if (!validate.ip.test(ip)) {
            throw 'IP is not an IP Address!';
        }

        this.ip = ip;

        if (mac && !validate.mac.test(mac)) {
            throw 'Provided MAC is not an MAC Address!';
        } else if (mac) {
            this.mac = mac;
        }

        this.auth = auth;

        this.tvChannels = new PhilipsTVChannels;
    }

    async info() : Promise<Record<string, unknown>> {
        const url = 'http://' + this.ip + ':1925/6/system';
        const result = await get(url);
        const response = JSON.parse(result);
        return response;
    }

    async requestPair() : Promise<Record<string, unknown>> {
        const pair_url = 'https://' + this.ip + ':1926/6/pair/request';
        const pair_payload = createUniquePairRequestPayload();
        const pair_result = await post(pair_url, JSON.stringify(pair_payload));
        const pair_response = JSON.parse(pair_result);

        this.auth = {
            user: pair_payload.device_id,
            pass: pair_response.auth_key,
            sendImmediately: false,
        };

        return pair_response;
    }

    async authorizePair(timestamp: string, pin: string) : Promise<Record<string, unknown>> {
        const auth_url = 'https://' + this.ip + ':1926/6/pair/grant';
        const auth_payload = prepareAuthenticationRequestPayload(
            timestamp,
            pin,
            this.auth!.user,
            this.auth!.pass,
        );

        await post(auth_url, JSON.stringify(auth_payload), this.auth);

        return {
            'apiUser': this.auth!.user,
            'apiPass': this.auth!.pass,
        };
    }

    async pair(pinCallback: () => Promise<string>) {
        const pair_response = await this.requestPair();
        const pin = await pinCallback();
        const auth_response = await this.authorizePair(pair_response.timestamp as string, pin);
        
        return auth_response;
    }

    async wakeOnLan() {
        if (this.mac) {
            wol.wake(this.mac, { address: '255.255.255.255' }, function (this, error) {
                if (error) {
                    this.warn('wakeOnLan: error: ' + error);
                }
            }.bind(this));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async getPowerState() {
        const url = 'https://' + this.ip + ':1926/6/powerstate';
        // eslint-disable-next-line quotes
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async setPowerState(on: boolean) {
        const url = 'https://' + this.ip + ':1926/6/powerstate';
        let request_body = { 'powerstate': 'Standby'};

        if (on) {
            request_body = { 'powerstate': 'On' };
        } 

        const result = await post(url, JSON.stringify(request_body), this.auth!);
        return JSON.parse(result);
    }

    async getApplications() {
        const url = 'https://' + this.ip + ':1926/6/applications';
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getCurrentActivity() {
        const url = 'https://' + this.ip + ':1926/6/activities/current';
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getCurrentTVChannel() {
        const url = 'https://' + this.ip + ':1926/6/activities/tv';
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getFavoriteList() {
        const url = 'https://' + this.ip + ':1926/6/channeldb/tv/favoriteLists/1';
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);       
    }

    async getTVChannels() {
        const url = 'https://' + this.ip + ':1926/6/channeldb/tv/channelLists/all';
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getVolume() {
        const url = 'https://' + this.ip + ':1926/6/audio/volume';
        const result = await get(url, '', this.auth!);
        const response = JSON.parse(result);    
        this.volume = response.current;
        this.volumeMax = response.max;
        this.volumeMin = response.min;
        return response;
    }

    async getVolumePercentage() {
        const result = await this.getVolume();
        return Math.floor((Number(result.current) * (this.volumeMax - this.volumeMin)) / 100);
    }

    async setVolume(value: number) {
        const url = 'https://' + this.ip + ':1926/6/audio/volume';
        const request_body = { 'muted': false, 'current': value };
        this.volume = value;
        const result = await post(url, JSON.stringify(request_body), this.auth!);
        return JSON.parse(result);    
    }

    async setVolumePercentage(percentage: number) {
        const result = await this.setVolume(Math.floor((Number(percentage) * (this.volumeMax - this.volumeMin)) / 100));
        return result;
    }

    async setMute(muted: boolean) {
        const url = 'https://' + this.ip + ':1926/6/audio/volume';
        const request_body = { 'muted': muted, 'current': this.volume };
        const result = await post(url, JSON.stringify(request_body), this.auth!);
        return JSON.parse(result);    
    }

    async sendKey(key: string) {
        const url = 'https://' + this.ip + ':1926/6/input/key';
        const request_body = { 'key': key };
        const result = await post(url, JSON.stringify(request_body), this.auth!);
        return JSON.parse(result);   
    }

    async launchApplication(application: Record<string, string>) {
        const url = 'https://' + this.ip + ':1926/6/activities/launch';
        const result = await post(url, JSON.stringify(application), this.auth!);
        return JSON.parse(result);   
    }

    async launchTVChannel(application: Record<string, string>) {
        const url = 'https://' + this.ip + ':1926/6/activities/tv';
        const result = await post(url, JSON.stringify(application), this.auth!);
        return JSON.parse(result); 
    }

    async turnOn(counter = 0) {
        while (counter < 100) {
            try {
                await this.setPowerState(true);
                return;
            } catch {
                await this.wakeOnLan();
            }
        }
    }

    async wakeUntilAPIReady(counter = 0) {
        while (counter < 100) {
            try {
                const result = await this.getPowerState();
                return result;
            } catch {
                await this.wakeOnLan();
            }
        }
    }
}


interface Channel {
    ccid: string;
    name: string;
    object: Record<string, string>;
}
