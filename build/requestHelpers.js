"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.post = exports.get = exports.doRequest = void 0;
const request_1 = __importDefault(require("request"));
async function doRequest(method, url, body = '', auth) {
    return new Promise(function (resolve, reject) {
        const payload = {
            url: url,
            method: method,
            body: body,
            rejectUnauthorized: false,
            timeout: 5000,
            followAllRedirects: true,
            forever: method === 'GET'
        };
        if (auth) {
            payload.auth = auth;
        }
        try {
            (0, request_1.default)(payload, function (error, res, body) {
                if (!error && res.statusCode === 200) {
                    resolve(body);
                }
                else if (error) {
                    reject(error);
                }
                else {
                    reject(res);
                }
            });
        }
        catch (_a) {
            reject('Request module failure');
        }
    });
}
exports.doRequest = doRequest;
async function get(url, body = '', auth) {
    return doRequest('GET', url, body, auth);
}
exports.get = get;
async function post(url, body = '', auth) {
    return doRequest('POST', url, body, auth);
}
exports.post = post;
//# sourceMappingURL=requestHelpers.js.map