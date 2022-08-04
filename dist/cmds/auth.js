"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareAuthenticationRequestPayload = void 0;
const crypto_1 = __importDefault(require("crypto"));
const secret_key = 'JCqdN5AcnAHgJYseUn7ER5k3qgtemfUvMRghQpTfTZq7Cvv8EPQPqfz6dDxPQPSu4gKFPWkJGw32zyASgJkHwCjU';
function prepareAuthenticationRequestPayload(timestamp, pin, apiUser, apiPass, appName) {
    const hash = crypto_1.default
        .createHmac('sha1', Buffer.from(secret_key, 'base64').toString())
        .update(timestamp + pin)
        .digest('hex');
    return {
        auth: {
            pin: pin,
            auth_timestamp: timestamp,
            auth_signature: hash,
        },
        device: {
            'device_name': 'heliotrope',
            'device_os': 'Android',
            'app_name': appName,
            'type': 'native',
            'app_id': 'app.id',
            'id': apiUser,
            'auth_key': apiPass,
        },
    };
}
exports.prepareAuthenticationRequestPayload = prepareAuthenticationRequestPayload;
//# sourceMappingURL=auth.js.map