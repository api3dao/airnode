"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var fs_1 = require("fs");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
var src_1 = require("./src");
var integrationInfoPath = (0, path_1.join)(__dirname, 'integration-info.json');
var integrationInfo = null;
if ((0, fs_1.existsSync)(integrationInfoPath)) {
    integrationInfo = (0, src_1.readIntegrationInfo)();
}
var networks = {};
if (integrationInfo) {
    networks[integrationInfo.network] = {
        url: integrationInfo.providerUrl,
        accounts: { mnemonic: integrationInfo.mnemonic },
    };
}
var config = {
    defaultNetwork: integrationInfo === null || integrationInfo === void 0 ? void 0 : integrationInfo.network,
    networks: networks,
    solidity: '0.8.6',
};
exports.default = config;
//# sourceMappingURL=hardhat.config.js.map