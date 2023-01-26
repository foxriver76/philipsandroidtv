import wol from 'wake_on_lan';

import { get, post } from './requestHelpers';
import { prepareAuthenticationRequestPayload } from './cmds/auth';
import { createUniquePairRequestPayload } from './cmds/pair';
const validate = {
    mac: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/,
    // eslint-disable-next-line
    ip: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    pin: /^[0-9]{4}$/
};

interface Channel {
    ccid: string;
    name: string;
    object: Record<string, string>;
}

interface Application {
    intent: {
        extras: Record<string, any>;
        component: {
            packageName: string;
            className: string;
        };
        action: string;
    };
}

interface AmbilightConfiguration {
    styleName: AmbilightStyle;
    isExpert: boolean;
    menuSetting: AmbilightVideoSetting | AmbilightAudioSetting;
}

interface VolumeObject {
    current: number;
    min: number;
    max: number;
    muted: boolean;
}

interface PowerObject {
    powerstate: 'On' | 'Standby';
}

export interface PhilipsTVConfig {
    apiVersion: number;
    wakeUntilAPIReadyCounter: number;
    broadcastIP: string;
    wakeOnLanRequests: number;
    wakeOnLanTimeout: number;
    apiType?: 'Jointspace' | 'Android';
}

export interface Authentication {
    user: string;
    pass: string;
    sendImmediately: boolean;
}

export interface SystemInfo {
    notifyChange: string;
    menulanguage: string;
    name: string;
    country: string;
    serialnumber_encrypted: string;
    softwareversion_encrypted: string;
    model_encrypted: string;
    deviceid_encrypted: string;
    nettvversion: string;
    epgsource: string;
    api_version: {
        Major: number;
        Minor: number;
        Patch: number;
    };
    featuring: {
        jsonfeatures: {
            editfavorites: string[];
            recordings: string[];
            ambilight: string[];
            menuitems: string[];
            textentry: string[];
            applications: string[];
            pointer: string[];
            inputkey: string[];
            activities: string[];
            channels: string[];
            mappings: string[];
        };
        systemfeatures: {
            tvtype: string;
            content: string[];
            tvsearch: string;
            pairing_type: string;
            secured_transport: string;
            companion_screen: string;
        };
    };
    os_type: string;
}

export type Input = 'HDMI 1' | 'HDMI 2' | 'HDMI 3' | 'HDMI 4';
export type AmbilightStyle = 'FOLLOW_COLOR' | 'FOLLOW_VIDEO' | 'FOLLOW_AUDIO';
export type AmbilightColorSetting = 'HOT_LAVA' | 'ISF' | 'PTA_LOUNGE' | 'FRESH_NATURE' | 'DEEP_WATER';
export type AmbilightVideoSetting = 'STANDARD' | 'NATURAL' | 'VIVID' | 'GAME' | 'COMFORT' | 'RELAX';
export type AmbilightAudioSetting =
    | 'ENERGY_ADAPTIVE_BRIGHTNESS'
    | 'ENERGY_ADAPTIVE_COLORS'
    | 'VU_METER'
    | 'SPECTRUM_ANALYZER'
    | 'KNIGHT_RIDER_CLOCKWISE'
    | 'KNIGHT_RIDER_ALTERNATING'
    | 'RANDOM_PIXEL_FLASH'
    | 'STROBO'
    | 'PARTY'
    | 'MODE_RANDOM';

export type AmbilightSetting = AmbilightAudioSetting | AmbilightColorSetting | AmbilightVideoSetting;

export class PhilipsTVChannels {
    public channels: Channel[] = [];

    reloadChannels(listChannels: string) {
        const channels = JSON.parse(listChannels);

        this.channels = [];

        for (const channel of channels.Channel) {
            this.channels.push({
                ccid: channel.ccid,
                name: channel.name,
                object: channel
            });
        }
    }

    getObjectByName(name: string): Record<string, string> {
        for (const channel of this.channels) {
            if (channel.name === name) {
                return channel.object;
            }
        }
        return {};
    }

    getNameByCcid(ccid: string): string {
        for (const channel of this.channels) {
            if (channel.ccid === ccid) {
                return channel.name;
            }
        }
        return '';
    }

    getObjectByCcid(ccid: string): Record<string, string> {
        for (const channel of this.channels) {
            if (channel.ccid === ccid) {
                return channel.object;
            }
        }
        return {};
    }
}

export class PhilipsTV {
    private readonly inputMapping = {
        'HDMI 1': 'content://android.media.tv/passthrough/com.mediatek.tvinput%2F.hdmi.HDMIInputService%2FHW5',
        'HDMI 2': 'content://android.media.tv/passthrough/com.mediatek.tvinput%2F.hdmi.HDMIInputService%2FHW6',
        'HDMI 3': 'content://android.media.tv/passthrough/com.mediatek.tvinput%2F.hdmi.HDMIInputService%2FHW7',
        'HDMI 4': 'content://android.media.tv/passthrough/com.mediatek.tvinput%2F.hdmi.HDMIInputService%2FHW8'
    } as const;

    private readonly ip: string;
    private readonly mac?: string;
    private auth?: Authentication;
    private config: PhilipsTVConfig;
    private volume?: number;
    private volumeMin = 0;
    private volumeMax = 0;
    private systemInfo: SystemInfo | undefined;
    private readonly apiPort: number;
    private readonly appName: string;
    public tvChannels: PhilipsTVChannels;
    private readonly protocol: 'http' | 'https';

    constructor(ip: string, mac?: string, auth?: Authentication, config?: PhilipsTVConfig, appName?: string) {
        if (!validate.ip.test(ip)) {
            throw new Error('IP is not an IP Address!');
        }

        this.ip = ip;

        if (mac && !validate.mac.test(mac)) {
            throw new Error('Provided MAC is not an MAC Address!');
        } else if (mac) {
            this.mac = mac;
        }

        if (config) {
            this.config = config;
        } else {
            this.config = {
                wakeUntilAPIReadyCounter: 100,
                apiVersion: 6,
                broadcastIP: '255.255.255.255',
                wakeOnLanRequests: 1,
                wakeOnLanTimeout: 1_000,
                apiType: 'Android'
            };
        }

        if (!this.config.apiType) {
            this.config.apiType = 'Android';
        }

        if (this.requiresPairing()) {
            this.auth = auth;
            this.protocol = 'https';
        } else {
            this.protocol = 'http';
        }

        if (this.config.apiType === 'Jointspace') {
            this.apiPort = 1925;
        } else {
            this.apiPort = 1926;
        }

        this.appName = appName || 'Homebridge';

        this.tvChannels = new PhilipsTVChannels();
    }

    async info(): Promise<SystemInfo> {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/system`;
        const result = await get(url);
        const response = JSON.parse(result);
        this.systemInfo = response;
        return response;
    }

    /**
     * Checks if setSource is supported
     */
    async supportsSetSource(): Promise<boolean> {
        if (!this.systemInfo) {
            await this.info();
        }

        return !!this.systemInfo?.featuring.jsonfeatures.activities.includes('intent');
    }

    /**
     * Set source if supported by the TV
     * @param input
     */
    async setSource(input: Input): Promise<string> {
        if (!(await this.supportsSetSource())) {
            throw new Error('setSource not supported by the API');
        }

        const app: Application = {
            intent: {
                extras: { uri: this.inputMapping[input]! },
                action: 'org.droidtv.playtv.SELECTURI',
                component: {
                    packageName: 'org.droidtv.playtv',
                    className: 'org.droidtv.playtv.PlayTvActivity'
                }
            }
        };

        return this.launchApplication(app);
    }

    requiresPairing(): boolean {
        if (this.config.apiType === 'Jointspace') {
            return false;
        }

        return true;
    }

    async requestPair(): Promise<Record<string, unknown>> {
        if (!this.requiresPairing()) {
            throw new Error('This API version does not require pairing');
        }

        const pair_url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/pair/request`;
        const pair_payload = createUniquePairRequestPayload(this.appName);
        const pair_result = await post(pair_url, JSON.stringify(pair_payload));
        const pair_response = JSON.parse(pair_result);

        this.auth = {
            user: pair_payload.device_id,
            pass: pair_response.auth_key,
            sendImmediately: false
        };

        return pair_response;
    }

    async authorizePair(timestamp: string, pin: string): Promise<Record<string, unknown>> {
        if (!this.requiresPairing()) {
            throw new Error('This API version does not require pairing');
        }

        const auth_url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/pair/grant`;
        const auth_payload = prepareAuthenticationRequestPayload(
            timestamp,
            pin,
            this.auth!.user,
            this.auth!.pass,
            this.appName
        );

        await post(auth_url, JSON.stringify(auth_payload), this.auth);

        return {
            apiUser: this.auth!.user,
            apiPass: this.auth!.pass
        };
    }

    async pair(pinCallback: () => Promise<string>) {
        if (!this.requiresPairing()) {
            throw new Error('This API version does not require pairing');
        }

        const pair_response = await this.requestPair();
        const pin = await pinCallback();
        const auth_response = await this.authorizePair(pair_response.timestamp as string, pin);

        return auth_response;
    }

    async wakeOnLan() {
        if (this.mac) {
            for (let i = 0; i < this.config.wakeOnLanRequests; i++) {
                wol.wake(
                    this.mac,
                    { address: this.config.broadcastIP },
                    function (this, error) {
                        if (error) {
                            console.log('wakeOnLan: error: ' + error);
                        }
                    }.bind(this)
                );
            }
            return new Promise(resolve => setTimeout(resolve, this.config.wakeOnLanTimeout));
        }
    }

    async getPowerState(): Promise<PowerObject> {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/powerstate`;
        // eslint-disable-next-line quotes
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async setPowerState(on: boolean): Promise<void> {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/powerstate`;
        let request_body = { powerstate: 'Standby' };

        if (on) {
            request_body = { powerstate: 'On' };
        }

        await post(url, JSON.stringify(request_body), this.auth!);
        return;
    }

    async getApplications() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/applications`;
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getCurrentActivity() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(
            this.config.apiVersion
        )}/activities/current`;
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getCurrentTVChannel() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/activities/tv`;
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getFavoriteList(favoriteListId: number) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(
            this.config.apiVersion
        )}/channeldb/tv/favoriteLists/${String(favoriteListId)}`;
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getTVChannels() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(
            this.config.apiVersion
        )}/channeldb/tv/channelLists/all`;
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getVolume(): Promise<VolumeObject> {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/audio/volume`;
        const result = await get(url, '', this.auth!);
        const response: VolumeObject = JSON.parse(result);
        this.volume = response.current;
        this.volumeMax = response.max;
        this.volumeMin = response.min;
        return response;
    }

    async getVolumePercentage() {
        const result = await this.getVolume();
        return Math.floor(Number(result.current) * (100 / (result.max - result.min)));
    }

    async setVolume(value: number) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/audio/volume`;
        const request_body = { muted: false, current: value };
        this.volume = value;
        return post(url, JSON.stringify(request_body), this.auth!);
    }

    async setVolumePercentage(percentage: number) {
        const result = await this.setVolume(Math.floor((Number(percentage) * (this.volumeMax - this.volumeMin)) / 100));
        return result;
    }

    async setMute(muted: boolean) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/audio/volume`;
        const request_body = { muted: muted, current: this.volume };
        return post(url, JSON.stringify(request_body), this.auth!);
    }

    async sendKey(key: string) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/input/key`;
        const request_body = { key: key };
        return post(url, JSON.stringify(request_body), this.auth!);
    }

    async launchApplication(application: Application) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/activities/launch`;
        return post(url, JSON.stringify(application), this.auth!);
    }

    async launchTVChannel(application: Record<string, string>) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/activities/tv`;
        return post(url, JSON.stringify(application), this.auth!);
    }

    async setAmbilightPlusHueState(state: boolean): Promise<any> {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/HueLamp/power`;
        return post(url, JSON.stringify({ power: state ? 'On' : 'Off' }), this.auth!);
    }

    async getAmbilightPlusHueState(): Promise<boolean> {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/HueLamp/power`;
        const result = await get(url, '', this.auth!);
        const ambiHueState = JSON.parse(result);
        return ambiHueState.power === 'On';
    }

    /**
     * Retrive the current Ambilight configuration
     */
    async getCurrentAmbilightConfiguration(): Promise<AmbilightConfiguration> {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(
            this.config.apiVersion
        )}/ambilight/currentconfiguration`;
        const result = await get(url, '', this.auth!);
        return JSON.parse(result);
    }

    async getAmbilightState(): Promise<boolean> {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/ambilight/power`;
        const result = await get(url, '', this.auth!);
        const ambilightState = JSON.parse(result);
        return ambilightState.power === 'On';
    }

    async setAmbilightState(state: boolean, style?: AmbilightStyle, setting?: AmbilightSetting): Promise<any> {
        if (state) {
            const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(
                this.config.apiVersion
            )}/ambilight/currentconfiguration`;
            return post(
                url,
                JSON.stringify({
                    styleName: style || 'FOLLOW_VIDEO',
                    isExpert: false,
                    menuSetting: setting || 'GAME'
                }),
                this.auth!
            );
        } else {
            const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(
                this.config.apiVersion
            )}/ambilight/power`;
            return post(url, JSON.stringify({ power: 'Off' }), this.auth!);
        }
    }

    async sendCustomAmbilightCmd(cmd: Record<string, any>) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(
            this.config.apiVersion
        )}/ambilight/currentconfiguration`;
        return post(url, JSON.stringify(cmd), this.auth!);
    }

    async turnOn(counter = 0) {
        while (counter < this.config.wakeUntilAPIReadyCounter) {
            counter++;
            if (counter % 10 === 0) {
                console.log(`turnOn: try ${counter}`);
            }
            try {
                await this.setPowerState(true);
                return;
            } catch {
                await this.wakeOnLan();
            }
        }
    }

    async wakeUntilAPIReady(counter = 0) {
        while (counter < this.config.wakeUntilAPIReadyCounter) {
            counter++;
            if (counter % 10 === 0) {
                console.log(`wakeUntilAPIReady: try ${counter}`);
            }
            try {
                const result = await this.getPowerState();
                return result;
            } catch {
                await this.wakeOnLan();
            }
        }
    }
}
