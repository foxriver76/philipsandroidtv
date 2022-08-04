export interface PhilipsTVConfig {
    apiVersion: number;
    wakeUntilAPIReadyCounter: number;
    broadcastIP: string;
    wakeOnLanRequests: number;
    wakeOnLanTimeout: number;
}
export interface Authentication {
    user: string;
    pass: string;
    sendImmediately: boolean;
}
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