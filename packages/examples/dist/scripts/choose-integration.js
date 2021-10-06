"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var prompts_1 = __importDefault(require("prompts"));
var src_1 = require("../src");
var createCliOption = function (name) { return ({
    title: name,
    value: name,
}); };
// NOTE: We could add "initial" field with the contents of current integration-info.json, but we already use the
// "initial value" semantics for hinting mnemonic and provider URL.
var questions = [
    {
        type: 'select',
        name: 'integration',
        message: 'Choose integration',
        // Every integration is a directory in the 'integrations' folder
        choices: (0, fs_1.readdirSync)((0, path_1.join)(__dirname, '../integrations'), { withFileTypes: true })
            .filter(function (integration) { return integration.isDirectory(); })
            .map(function (integration) { return integration.name; })
            .map(createCliOption),
    },
    {
        type: 'select',
        name: 'airnodeType',
        message: 'Choose Airnode type',
        choices: [createCliOption('local'), createCliOption('aws')],
    },
    {
        type: 'select',
        name: 'network',
        message: 'Select target blockchain network',
        choices: function (prev) {
            var options = [createCliOption('rinkeby')];
            // Only allow running on localhost if running Airnode locally
            if (prev === 'local')
                options.push(createCliOption('localhost'));
            return options;
        },
    },
    {
        type: 'text',
        name: 'mnemonic',
        message: [
            'Since you chose testnet network, we need an account with testnet funds to connect to the blockchain.',
            '',
            'IMPORTANT: DO NOT ENTER A MNEMONIC LINKED WITH MAINNET ACCOUNTS!!!',
            '',
            'Enter the testnet mnemonic phrase',
        ].join('\n'),
        initial: function (_prev, values) {
            // The default hardhat mnemonic. See: https://hardhat.org/hardhat-network/reference/#config
            return values.network === 'localhost' ? 'test test test test test test test test test test test junk' : '';
        },
    },
    {
        type: 'text',
        name: 'providerUrl',
        message: 'Enter a provider URL',
        initial: function (_prev, values) {
            // Hardhat network runs by default run on http://127.0.0.1:8545/
            if (values.network === 'localhost')
                return 'http://127.0.0.1:8545/';
            if (values.network === 'rinkeby')
                return 'https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID>';
            return '';
        },
    },
];
/**
 * Ask the user for the integration choice and return them as an object.
 */
var chooseIntegration = function () { return __awaiter(void 0, void 0, void 0, function () {
    var response;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, prompts_1.default)(questions)];
            case 1:
                response = _a.sent();
                return [2 /*return*/, response];
        }
    });
}); };
var main = function () { return __awaiter(void 0, void 0, void 0, function () {
    var integration;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, chooseIntegration()];
            case 1:
                integration = _a.sent();
                (0, fs_1.writeFileSync)((0, path_1.join)(__dirname, '../integration-info.json'), JSON.stringify(integration, null, 2));
                src_1.cliPrint.info("A file 'integration-info.json' was created!");
                return [2 /*return*/];
        }
    });
}); };
(0, src_1.runAndHandleErrors)(main);
//# sourceMappingURL=choose-integration.js.map