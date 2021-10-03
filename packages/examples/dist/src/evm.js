"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readChainId = exports.getDeployedContract = exports.deployContract = exports.getAirnodeXpub = exports.getAirnodeWallet = exports.getUserWallet = exports.getProvider = void 0;
var path_1 = require("path");
var fs_1 = require("fs");
var ethers_1 = require("ethers");
var dotenv_1 = require("dotenv");
var utils_1 = require("./utils");
/**
 * @returns The ethers provider connected to the provider URL specified in the "integration-info.json".
 */
var getProvider = function () {
    var integrationInfo = (0, utils_1.readIntegrationInfo)();
    var provider = new ethers_1.ethers.providers.JsonRpcProvider(integrationInfo.providerUrl);
    return provider;
};
exports.getProvider = getProvider;
/**
 * Reads the mnemonic and provider URL from "integration-info.json" and returns the connected wallet.
 *
 * @returns The connected wallet.
 */
var getUserWallet = function () {
    var integrationInfo = (0, utils_1.readIntegrationInfo)();
    var provider = (0, exports.getProvider)();
    return ethers_1.ethers.Wallet.fromMnemonic(integrationInfo.mnemonic).connect(provider);
};
exports.getUserWallet = getUserWallet;
/**
 * Reads the "secrets.env" of the particular integration to obtain the Airnode mnemonic of the Airnode wallet. This
 * wallet is not connected to the provider, since we do not need to make any transactions with it.
 *
 * @returns The Airnode wallet.
 */
var getAirnodeWallet = function () {
    var integrationInfo = (0, utils_1.readIntegrationInfo)();
    var integrationSecrets = (0, dotenv_1.parse)((0, fs_1.readFileSync)((0, path_1.join)(__dirname, "../integrations/" + integrationInfo.integration + "/secrets.env")));
    return ethers_1.ethers.Wallet.fromMnemonic(integrationSecrets['AIRNODE_WALLET_MNEMONIC']);
};
exports.getAirnodeWallet = getAirnodeWallet;
/**
 * Derives the Airnode extended public key from the Airnode wallet.
 *
 * @param airnodeWallet
 * @returns The extended public key
 */
var getAirnodeXpub = function (airnodeWallet) {
    var hdNode = ethers_1.ethers.utils.HDNode.fromMnemonic(airnodeWallet.mnemonic.phrase);
    return hdNode.neuter().extendedKey;
};
exports.getAirnodeXpub = getAirnodeXpub;
/**
 * Reads the compiled solidity artifact necessary for contract deployment.
 *
 * @param artifactsFolderPath
 * @returns The compiled artifact
 */
var getArtifact = function (artifactsFolderPath) {
    var fullArtifactsPath = (0, path_1.join)(__dirname, '../artifacts/', artifactsFolderPath);
    var files = (0, fs_1.readdirSync)(fullArtifactsPath);
    var artifactName = files.find(function (f) { return !f.endsWith('.dbg.json'); });
    var artifactPath = (0, path_1.join)(fullArtifactsPath, artifactName);
    return require(artifactPath);
};
/**
 * Deploys the contract specified by the path to the artifact and constructor arguments. This method will also write the
 * address of the deployed contract which can be used to connect to the contract.
 *
 * @param artifactsFolderPath
 * @param args Arguments for the contract constructor to be deployed
 * @returns The deployed contract
 */
var deployContract = function (artifactsFolderPath, args) {
    if (args === void 0) { args = []; }
    return __awaiter(void 0, void 0, void 0, function () {
        var artifact, contractFactory, _a, _b, _c, contract, deploymentsPath, network, deploymentPath, deployment, deploymentName;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    artifact = getArtifact(artifactsFolderPath);
                    _b = (_a = ethers_1.ethers.ContractFactory).bind;
                    _c = [void 0, artifact.abi, artifact.bytecode];
                    return [4 /*yield*/, (0, exports.getUserWallet)()];
                case 1:
                    contractFactory = new (_b.apply(_a, _c.concat([_e.sent()])))();
                    return [4 /*yield*/, contractFactory.deploy.apply(contractFactory, __spreadArray([], __read(args), false))];
                case 2:
                    contract = _e.sent();
                    return [4 /*yield*/, contract.deployed()];
                case 3:
                    _e.sent();
                    deploymentsPath = (0, path_1.join)(__dirname, '../deployments');
                    if (!(0, fs_1.existsSync)(deploymentsPath))
                        (0, fs_1.mkdirSync)(deploymentsPath);
                    network = (0, utils_1.readIntegrationInfo)().network;
                    deploymentPath = (0, path_1.join)(deploymentsPath, network + '.json');
                    deployment = {};
                    if ((0, fs_1.existsSync)(deploymentPath))
                        deployment = JSON.parse((0, fs_1.readFileSync)(deploymentPath).toString());
                    deploymentName = (0, utils_1.removeExtension)(artifactsFolderPath);
                    // Write down the address of deployed contract
                    (0, fs_1.writeFileSync)(deploymentPath, JSON.stringify(__assign(__assign({}, deployment), (_d = {}, _d[deploymentName] = contract.address, _d)), null, 2));
                    return [2 /*return*/, contract];
            }
        });
    });
};
exports.deployContract = deployContract;
/**
 * Connect to the already deployed contract specified by the path to the compiled contract artifact.
 *
 * @param artifactsFolderPath
 * @returns The deployed contract
 */
var getDeployedContract = function (artifactsFolderPath) { return __awaiter(void 0, void 0, void 0, function () {
    var artifact, network, deploymentPath, deployment, deploymentName, _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                artifact = getArtifact(artifactsFolderPath);
                network = (0, utils_1.readIntegrationInfo)().network;
                deploymentPath = (0, path_1.join)(__dirname, '../deployments', network + '.json');
                deployment = JSON.parse((0, fs_1.readFileSync)(deploymentPath).toString());
                deploymentName = (0, utils_1.removeExtension)(artifactsFolderPath);
                _b = (_a = ethers_1.ethers.Contract).bind;
                _c = [void 0, deployment[deploymentName], artifact.abi];
                return [4 /*yield*/, (0, exports.getUserWallet)()];
            case 1: return [2 /*return*/, new (_b.apply(_a, _c.concat([_d.sent()])))()];
        }
    });
}); };
exports.getDeployedContract = getDeployedContract;
/**
 * @returns The chain id of the chosen network
 */
var readChainId = function () { return __awaiter(void 0, void 0, void 0, function () {
    var network;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.getProvider)().getNetwork()];
            case 1:
                network = _a.sent();
                return [2 /*return*/, network.chainId];
        }
    });
}); };
exports.readChainId = readChainId;
//# sourceMappingURL=evm.js.map