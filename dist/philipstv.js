"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhilipsTV = exports.PhilipsTVChannels = void 0;
const wake_on_lan_1 = __importDefault(require("wake_on_lan"));
const requestHelpers_1 = require("./requestHelpers");
const auth_1 = require("./cmds/auth");
const pair_1 = require("./cmds/pair");
const validate = {
    mac: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/,
    // eslint-disable-next-line
    ip: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    pin: /^[0-9]{4}$/,
};
class PhilipsTVChannels {
    constructor() {
        this.channels = [];
    }
    reloadChannels(listChannels) {
        const channels = JSON.parse(listChannels);
        this.channels = [];
        for (const channel of channels.Channel) {
            this.channels.push({
                ccid: channel.ccid, name: channel.name, object: channel,
            });
        }
    }
    getObjectByName(name) {
        for (const channel of this.channels) {
            if (channel.name === name) {
                return channel.object;
            }
        }
        return {};
    }
    getNameByCcid(ccid) {
        for (const channel of this.channels) {
            if (channel.ccid === ccid) {
                return channel.name;
            }
        }
        return '';
    }
    getObjectByCcid(ccid) {
        for (const channel of this.channels) {
            if (channel.ccid === ccid) {
                return channel.object;
            }
        }
        return {};
    }
}
exports.PhilipsTVChannels = PhilipsTVChannels;
class PhilipsTV {
    constructor(ip, mac, auth, config, appName) {
        this.volumeMin = 0;
        this.volumeMax = 0;
        if (!validate.ip.test(ip)) {
            throw 'IP is not an IP Address!';
        }
        this.ip = ip;
        if (mac && !validate.mac.test(mac)) {
            throw 'Provided MAC is not an MAC Address!';
        }
        else if (mac) {
            this.mac = mac;
        }
        if (config) {
            this.config = config;
        }
        else {
            this.config = {
                wakeUntilAPIReadyCounter: 100,
                apiVersion: 6,
                broadcastIP: '255.255.255.255',
                wakeOnLanRequests: 1,
                wakeOnLanTimeout: 1000,
            };
        }
        if (this.requiresPairing()) {
            this.auth = auth;
            this.protocol = 'https';
        }
        else {
            this.protocol = 'http';
        }
        if (this.config.apiVersion < 6) {
            this.apiPort = 1925;
        }
        else {
            this.apiPort = 1926;
        }
        this.appName = appName || 'Homebridge';
        this.tvChannels = new PhilipsTVChannels;
    }
    async info() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/system`;
        const result = await requestHelpers_1.get(url);
        const response = JSON.parse(result);
        return response;
    }
    requiresPairing() {
        if (this.config.apiVersion < 6) {
            return false;
        }
        return true;
    }
    async requestPair() {
        if (!this.requiresPairing()) {
            throw new Error('This API version does not require pairing');
        }
        const pair_url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/pair/request`;
        const pair_payload = pair_1.createUniquePairRequestPayload(this.appName);
        const pair_result = await requestHelpers_1.post(pair_url, JSON.stringify(pair_payload));
        const pair_response = JSON.parse(pair_result);
        this.auth = {
            user: pair_payload.device_id,
            pass: pair_response.auth_key,
            sendImmediately: false,
        };
        return pair_response;
    }
    async authorizePair(timestamp, pin) {
        if (!this.requiresPairing()) {
            throw new Error('This API version does not require pairing');
        }
        const auth_url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/pair/grant`;
        const auth_payload = auth_1.prepareAuthenticationRequestPayload(timestamp, pin, this.auth.user, this.auth.pass, this.appName);
        await requestHelpers_1.post(auth_url, JSON.stringify(auth_payload), this.auth);
        return {
            'apiUser': this.auth.user,
            'apiPass': this.auth.pass,
        };
    }
    async pair(pinCallback) {
        if (!this.requiresPairing()) {
            throw new Error('This API version does not require pairing');
        }
        const pair_response = await this.requestPair();
        const pin = await pinCallback();
        const auth_response = await this.authorizePair(pair_response.timestamp, pin);
        return auth_response;
    }
    async wakeOnLan() {
        if (this.mac) {
            for (let i = 0; i < this.config.wakeOnLanRequests; i++) {
                wake_on_lan_1.default.wake(this.mac, { address: this.config.broadcastIP }, function (error) {
                    if (error) {
                        console.log('wakeOnLan: error: ' + error);
                    }
                }.bind(this));
            }
            return new Promise(resolve => setTimeout(resolve, this.config.wakeOnLanTimeout));
        }
    }
    async getPowerState() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/powerstate`;
        // eslint-disable-next-line quotes
        const result = await requestHelpers_1.get(url, '', this.auth);
        return JSON.parse(result);
    }
    async setPowerState(on) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/powerstate`;
        let request_body = { 'powerstate': 'Standby' };
        if (on) {
            request_body = { 'powerstate': 'On' };
        }
        await requestHelpers_1.post(url, JSON.stringify(request_body), this.auth);
        return;
    }
    async getApplications() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/applications`;
        const result = await requestHelpers_1.get(url, '', this.auth);
        return JSON.parse(result);
    }
    async getCurrentActivity() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/activities/current`;
        const result = await requestHelpers_1.get(url, '', this.auth);
        return JSON.parse(result);
    }
    async getCurrentTVChannel() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/activities/tv`;
        const result = await requestHelpers_1.get(url, '', this.auth);
        return JSON.parse(result);
    }
    async getFavoriteList(favoriteListId) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/channeldb/tv/favoriteLists/${String(favoriteListId)}`;
        const result = await requestHelpers_1.get(url, '', this.auth);
        return JSON.parse(result);
    }
    async getTVChannels() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/channeldb/tv/channelLists/all`;
        const result = await requestHelpers_1.get(url, '', this.auth);
        return JSON.parse(result);
    }
    async getVolume() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/audio/volume`;
        const result = await requestHelpers_1.get(url, '', this.auth);
        const response = JSON.parse(result);
        this.volume = response.current;
        this.volumeMax = response.max;
        this.volumeMin = response.min;
        return response;
    }
    async getVolumePercentage() {
        const result = await this.getVolume();
        return Math.floor(Number(result.current) * (100 / (result.max - result.min)));
    }
    async setVolume(value) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/audio/volume`;
        const request_body = { 'muted': false, 'current': value };
        this.volume = value;
        return requestHelpers_1.post(url, JSON.stringify(request_body), this.auth);
    }
    async setVolumePercentage(percentage) {
        const result = await this.setVolume(Math.floor((Number(percentage) * (this.volumeMax - this.volumeMin)) / 100));
        return result;
    }
    async setMute(muted) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/audio/volume`;
        const request_body = { 'muted': muted, 'current': this.volume };
        return requestHelpers_1.post(url, JSON.stringify(request_body), this.auth);
    }
    async sendKey(key) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/input/key`;
        const request_body = { 'key': key };
        return requestHelpers_1.post(url, JSON.stringify(request_body), this.auth);
    }
    async launchApplication(application) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/activities/launch`;
        return requestHelpers_1.post(url, JSON.stringify(application), this.auth);
    }
    async launchTVChannel(application) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/activities/tv`;
        return requestHelpers_1.post(url, JSON.stringify(application), this.auth);
    }
    async setAmbilightPlusHueState(state) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/HueLamp/power`;
        return requestHelpers_1.post(url, JSON.stringify({ power: state ? 'On' : 'Off' }), this.auth);
    }
    async getAmbilightPlusHueState() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/HueLamp/power`;
        const result = await requestHelpers_1.get(url, '', this.auth);
        const ambiHueState = JSON.parse(result);
        return ambiHueState.power === 'On';
    }
    async getAmbilightState() {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/ambilight/power`;
        const result = await requestHelpers_1.get(url, '', this.auth);
        const ambilightState = JSON.parse(result);
        return ambilightState.power === 'On';
    }
    async setAmbilightState(state, style, setting) {
        if (state) {
            const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/ambilight/currentconfiguration`;
            return requestHelpers_1.post(url, JSON.stringify({
                styleName: style || 'FOLLOW_VIDEO',
                isExpert: false,
                menuSetting: setting || 'GAME',
            }), this.auth);
        }
        else {
            const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/ambilight/power`;
            return requestHelpers_1.post(url, JSON.stringify({ power: 'Off' }), this.auth);
        }
    }
    async sendCustomAmbilightCmd(cmd) {
        const url = `${this.protocol}://${this.ip}:${this.apiPort}/${String(this.config.apiVersion)}/ambilight/currentconfiguration`;
        return requestHelpers_1.post(url, JSON.stringify(cmd), this.auth);
    }
    async turnOn(counter = 0) {
        while (counter < this.config.wakeUntilAPIReadyCounter) {
            counter++;
            if ((counter % 10) === 0) {
                console.log(`turnOn: try ${counter}`);
            }
            try {
                await this.setPowerState(true);
                return;
            }
            catch (_a) {
                await this.wakeOnLan();
            }
        }
    }
    async wakeUntilAPIReady(counter = 0) {
        while (counter < this.config.wakeUntilAPIReadyCounter) {
            counter++;
            if ((counter % 10) === 0) {
                console.log(`wakeUntilAPIReady: try ${counter}`);
            }
            try {
                const result = await this.getPowerState();
                return result;
            }
            catch (_a) {
                await this.wakeOnLan();
            }
        }
    }
}
exports.PhilipsTV = PhilipsTV;
//# sourceMappingURL=philipstv.js.map