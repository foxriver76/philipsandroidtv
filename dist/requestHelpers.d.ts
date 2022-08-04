import { Authentication } from './philipstv';
export interface RequestPayload {
    url: string;
    method: string;
    body: string;
    rejectUnauthorized: boolean;
    timeout: number;
    forever: boolean;
    followAllRedirects: boolean;
    auth?: Authentication;
}
export declare function doRequest(method: string, url: string, body?: string, auth?: Authentication): Promise<string>;
export declare function get(url: string, body?: string, auth?: Authentication): Promise<string>;
export declare function post(url: string, body?: string, auth?: Authentication): Promise<string>;
//# sourceMappingURL=requestHelpers.d.ts.map