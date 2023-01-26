import request from 'request';
import { Authentication } from './philipstv';

type Method = 'GET' | 'POST';

interface RequestPayload {
    url: string;
    method: string;
    body: string;
    rejectUnauthorized: boolean;
    timeout: number;
    followAllRedirects: boolean;
    auth?: Authentication;
    forever: boolean;
}

async function doRequest(method: Method, url: string, body = '', auth?: Authentication): Promise<string> {
    return new Promise(function (this, resolve, reject) {
        const payload: RequestPayload = {
            url: url,
            method: method,
            body: body,
            rejectUnauthorized: false,
            timeout: 5_000,
            followAllRedirects: true,
            forever: method === 'GET'
        };

        if (auth) {
            payload.auth = auth;
        }

        try {
            request(payload, function (error, res, body) {
                if (!error && res.statusCode === 200) {
                    resolve(body);
                } else if (error) {
                    reject(error);
                } else {
                    reject(res);
                }
            });
        } catch {
            reject('Request module failure');
        }
    });
}

export async function get(url: string, body = '', auth?: Authentication): Promise<string> {
    return doRequest('GET', url, body, auth);
}

export async function post(url: string, body = '', auth?: Authentication): Promise<string> {
    return doRequest('POST', url, body, auth);
}
