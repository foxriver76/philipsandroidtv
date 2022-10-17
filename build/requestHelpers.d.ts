import { Authentication } from './philipstv';
declare type Method = 'GET' | 'POST';
export interface RequestPayload {
    url: string;
    method: string;
    body: string;
    rejectUnauthorized: boolean;
    timeout: number;
    followAllRedirects: boolean;
    auth?: Authentication;
    forever: boolean;
}
export declare function doRequest(method: Method, url: string, body?: string, auth?: Authentication): Promise<string>;
export declare function get(url: string, body?: string, auth?: Authentication): Promise<string>;
export declare function post(url: string, body?: string, auth?: Authentication): Promise<string>;
export {};
//# sourceMappingURL=requestHelpers.d.ts.map