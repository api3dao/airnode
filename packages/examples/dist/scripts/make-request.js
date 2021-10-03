"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRequest = void 0;
var ethers_1 = require("ethers");
var admin_1 = require("@api3/admin");
var src_1 = require("../src");
var fulfilled = function (requestId) { return __awaiter(void 0, void 0, void 0, function () {
    var airnodeRrp, provider;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, src_1.getDeployedContract)('@api3/protocol/contracts/rrp/AirnodeRrp.sol')];
            case 1:
                airnodeRrp = _a.sent();
                provider = (0, src_1.getProvider)();
                return [2 /*return*/, new Promise(function (resolve) { return provider.once(airnodeRrp.filters.FulfilledRequest(null, requestId), resolve); })];
        }
    });
}); };
var makeRequest = function () { return __awaiter(void 0, void 0, void 0, function () {
    var integrationInfo, requester, airnodeRrp, airnodeWallet, sponsor, endpointId, airnodeRrpTyped, sponsorWalletAddress, getEncodedParameters, receipt, _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                integrationInfo = (0, src_1.readIntegrationInfo)();
                return [4 /*yield*/, (0, src_1.getDeployedContract)("contracts/" + integrationInfo.integration + "/Requester.sol")];
            case 1:
                requester = _d.sent();
                return [4 /*yield*/, (0, src_1.getDeployedContract)('@api3/protocol/contracts/rrp/AirnodeRrp.sol')];
            case 2:
                airnodeRrp = _d.sent();
                airnodeWallet = (0, src_1.getAirnodeWallet)();
                sponsor = ethers_1.ethers.Wallet.fromMnemonic(integrationInfo.mnemonic);
                endpointId = (0, src_1.readConfig)().triggers.rrp[0].endpointId;
                return [4 /*yield*/, (0, admin_1.getAirnodeRrp)(integrationInfo.providerUrl, { airnodeRrpAddress: airnodeRrp.address })];
            case 3:
                airnodeRrpTyped = _d.sent();
                sponsorWalletAddress = (0, admin_1.deriveSponsorWalletAddress)(airnodeRrpTyped, airnodeWallet.address, sponsor.address, (0, src_1.getAirnodeXpub)(airnodeWallet));
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("../integrations/" + integrationInfo.integration + "/request-utils.ts")); })];
            case 4:
                getEncodedParameters = (_d.sent()).getEncodedParameters;
                _b = (_a = requester).makeRequest;
                _c = [airnodeWallet.address,
                    endpointId,
                    sponsor.address,
                    sponsorWalletAddress];
                return [4 /*yield*/, getEncodedParameters()];
            case 5: return [4 /*yield*/, _b.apply(_a, _c.concat([_d.sent()]))];
            case 6:
                receipt = _d.sent();
                // Wait until the transaction is mined
                return [2 /*return*/, new Promise(function (resolve) {
                        return (0, src_1.getProvider)().once(receipt.hash, function (tx) {
                            var parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
                            resolve(parsedLog.args.requestId);
                        });
                    })];
        }
    });
}); };
exports.makeRequest = makeRequest;
var main = function () { return __awaiter(void 0, void 0, void 0, function () {
    var requestId, integrationInfo, printResponse;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                src_1.cliPrint.info('Making request...');
                return [4 /*yield*/, (0, exports.makeRequest)()];
            case 1:
                requestId = _a.sent();
                src_1.cliPrint.info('Waiting for fulfillment...');
                return [4 /*yield*/, fulfilled(requestId)];
            case 2:
                _a.sent();
                src_1.cliPrint.info('Request fulfilled');
                integrationInfo = (0, src_1.readIntegrationInfo)();
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("../integrations/" + integrationInfo.integration + "/request-utils.ts")); })];
            case 3:
                printResponse = (_a.sent()).printResponse;
                return [4 /*yield*/, printResponse(requestId)];
            case 4:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
(0, src_1.runAndHandleErrors)(main);
//# sourceMappingURL=make-request.js.map