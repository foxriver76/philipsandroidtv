export declare function prepareAuthenticationRequestPayload(timestamp: string, pin: string, apiUser: string, apiPass: string, appName: string): {
    auth: {
        pin: string;
        auth_timestamp: string;
        auth_signature: string;
    };
    device: {
        device_name: string;
        device_os: string;
        app_name: string;
        type: string;
        app_id: string;
        id: string;
        auth_key: string;
    };
};
//# sourceMappingURL=auth.d.ts.map