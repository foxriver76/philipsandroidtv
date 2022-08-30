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
export declare type AmbilightStyle = 'FOLLOW_COLOR' | 'FOLLOW_VIDEO' | 'FOLLOW_AUDIO';
export declare type AmbilightColorSetting = 'HOT_LAVA' | 'ISF' | 'PTA_LOUNGE' | 'FRESH_NATURE' | 'DEEP_WATER';
export declare type AmbilightVideoSetting = 'STANDARD' | 'NATURAL' | 'VIVID' | 'GAME' | 'COMFORT' | 'RELAX';
export declare type AmbilightAudioSetting = 'ENERGY_ADAPTIVE_BRIGHTNESS' | 'ENERGY_ADAPTIVE_COLORS' | 'VU_METER' | 'SPECTRUM_ANALYZER' | 'KNIGHT_RIDER_CLOCKWISE' | 'KNIGHT_RIDER_ALTERNATING' | 'RANDOM_PIXEL_FLASH' | 'STROBO' | 'PARTY' | 'MODE_RANDOM';
export declare type AmbilightSetting = AmbilightAudioSetting | AmbilightColorSetting | AmbilightVideoSetting;
export declare class PhilipsTVChannels {
    channels: Channel[];
    reloadChannels(listChannels: string): void;
    getObjectByName(name: string): Record<string, string>;
    getNameByCcid(ccid: string): string;
    getObjectByCcid(ccid: string): Record<string, string>;
}
export declare class PhilipsTV {
    private readonly ip;
    private readonly mac?;
    private auth?;
    private config;
    private volume?;
    private volumeMin;
    private volumeMax;
    private readonly apiPort;
    private readonly appName;
    tvChannels: PhilipsTVChannels;
    private readonly protocol;
    constructor(ip: string, mac?: string, auth?: Authentication, config?: PhilipsTVConfig, appName?: string);
    info(): Promise<Record<string, unknown>>;
    requiresPairing(): boolean;
    requestPair(): Promise<Record<string, unknown>>;
    authorizePair(timestamp: string, pin: string): Promise<Record<string, unknown>>;
    pair(pinCallback: () => Promise<string>): Promise<Record<string, unknown>>;
    wakeOnLan(): Promise<unknown>;
    getPowerState(): Promise<any>;
    setPowerState(on: boolean): Promise<void>;
    getApplications(): Promise<any>;
    getCurrentActivity(): Promise<any>;
    getCurrentTVChannel(): Promise<any>;
    getFavoriteList(favoriteListId: number): Promise<any>;
    getTVChannels(): Promise<any>;
    getVolume(): Promise<any>;
    getVolumePercentage(): Promise<number>;
    setVolume(value: number): Promise<string>;
    setVolumePercentage(percentage: number): Promise<string>;
    setMute(muted: boolean): Promise<string>;
    sendKey(key: string): Promise<string>;
    launchApplication(application: Record<string, string>): Promise<string>;
    launchTVChannel(application: Record<string, string>): Promise<string>;
    setAmbilightPlusHueState(state: boolean): Promise<any>;
    getAmbilightPlusHueState(): Promise<boolean>;
    getAmbilightState(): Promise<boolean>;
    setAmbilightState(state: boolean, style?: AmbilightStyle, setting?: AmbilightSetting): Promise<any>;
    sendCustomAmbilightCmd(cmd: Record<string, any>): Promise<string>;
    turnOn(counter?: number): Promise<void>;
    wakeUntilAPIReady(counter?: number): Promise<any>;
}
interface Channel {
    ccid: string;
    name: string;
    object: Record<string, string>;
}
export {};
//# sourceMappingURL=philipstv.d.ts.map