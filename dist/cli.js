"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const caporal_1 = __importDefault(require("caporal"));
const enquirer_1 = require("enquirer");
const philipstv_1 = require("./philipstv");
const cli = caporal_1.default;
cli.version('0.0.1')
    .command('info', 'Fetch information from TV')
    .argument('<host>', 'TV IP Address', cli.STRING)
    .action(async (args, option, logger) => {
    try {
        const philipsTv = new philipstv_1.PhilipsTV(args.host);
        const result = await philipsTv.info();
        logger.info(result);
    }
    catch (error) {
        logger.error(error.message);
        logger.debug(error.stack);
    }
    finally {
        process.exit();
    }
})
    .command('pair', 'Performs pairing with TV to generate API user and password')
    .argument('<host>', 'TV IP Address', cli.STRING)
    .action(async (args, option, logger) => {
    try {
        const philipsTv = new philipstv_1.PhilipsTV(args.host);
        const result = await philipsTv.pair(async () => {
            const response = await enquirer_1.prompt({
                type: 'input',
                name: 'pin',
                message: 'Please enter the four-digit PIN.',
            });
            return response.pin;
        });
        logger.info(result);
    }
    catch (error) {
        logger.error(error.message);
        logger.debug(error.stack);
    }
    finally {
        process.exit();
    }
})
    .command('powerstate', 'Control TV Powerstate')
    .argument('<host>', 'TV IP Address', cli.STRING)
    .argument('<apiUser>', 'TV API Username', cli.STRING)
    .argument('<apiPass>', 'TV API Password', cli.STRING)
    .option('-s, --state <state>', 'Turning TV on (true) or sleep (false)', cli.BOOLEAN)
    .action(async (args, option, logger) => {
    try {
        const auth = {
            user: args.apiUser,
            pass: args.apiPass,
            sendImmediately: false,
        };
        const philipsTv = new philipstv_1.PhilipsTV(args.host, undefined, auth);
        if (option.state) {
            const result = await philipsTv.setPowerState(option.state);
            logger.info('OK', result);
        }
        else {
            const result = await philipsTv.getPowerState();
            logger.info('OK', result);
        }
    }
    catch (error) {
        logger.error(error.message);
        logger.debug(error.stack);
    }
    finally {
        process.exit();
    }
})
    .command('apps', 'Gets list of Applications')
    .argument('<host>', 'TV IP Address', cli.STRING)
    .argument('<apiUser>', 'TV API Username', cli.STRING)
    .argument('<apiPass>', 'TV API Password', cli.STRING)
    .action(async (args, option, logger) => {
    try {
        const auth = {
            user: args.apiUser,
            pass: args.apiPass,
            sendImmediately: false,
        };
        const philipsTv = new philipstv_1.PhilipsTV(args.host, undefined, auth);
        const result = await philipsTv.getApplications();
        logger.info('OK', result);
    }
    catch (error) {
        logger.error(error.message);
        logger.debug(error.stack);
    }
    finally {
        process.exit();
    }
})
    .command('channels', 'Gets list of Channels')
    .argument('<host>', 'TV IP Address', cli.STRING)
    .argument('<apiUser>', 'TV API Username', cli.STRING)
    .argument('<apiPass>', 'TV API Password', cli.STRING)
    .action(async (args, option, logger) => {
    try {
        const auth = {
            user: args.apiUser,
            pass: args.apiPass,
            sendImmediately: false,
        };
        const philipsTv = new philipstv_1.PhilipsTV(args.host, undefined, auth);
        const result = await philipsTv.getCurrentActivity();
        logger.info('OK', result);
    }
    catch (error) {
        logger.error(error.message);
        logger.debug(error.stack);
    }
    finally {
        process.exit();
    }
})
    .command('volume', 'Gets Volume')
    .argument('<host>', 'TV IP Address', cli.STRING)
    .argument('<apiUser>', 'TV API Username', cli.STRING)
    .argument('<apiPass>', 'TV API Password', cli.STRING)
    .action(async (args, option, logger) => {
    try {
        const auth = {
            user: args.apiUser,
            pass: args.apiPass,
            sendImmediately: false,
        };
        const philipsTv = new philipstv_1.PhilipsTV(args.host, undefined, auth);
        const result = await philipsTv.getVolume();
        logger.info('OK', result);
    }
    catch (error) {
        logger.error(error.message);
        logger.debug(error.stack);
    }
    finally {
        process.exit();
    }
});
cli.parse(process.argv);
//# sourceMappingURL=cli.js.map