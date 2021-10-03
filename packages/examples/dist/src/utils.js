"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeExtension = exports.formatSecrets = exports.readConfig = exports.readAirnodeSecrets = exports.readAwsSecrets = exports.readIntegrationInfo = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var dotenv_1 = require("dotenv");
/**
 * @returns The contents of the "integration-info.json" file (throws if it doesn't exist)
 */
var readIntegrationInfo = function () {
    return JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../integration-info.json')).toString());
};
exports.readIntegrationInfo = readIntegrationInfo;
/**
 * @returns The contents of the "aws.env" file (throws if it doesn't exist)
 */
var readAwsSecrets = function () { return (0, dotenv_1.parse)((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../aws.env'))); };
exports.readAwsSecrets = readAwsSecrets;
/**
 * @returns The contents of the "secrets.env" file for the current integration (throws if it doesn't exist)
 */
var readAirnodeSecrets = function () {
    var integrationInfo = (0, exports.readIntegrationInfo)();
    return (0, dotenv_1.parse)((0, fs_1.readFileSync)((0, path_1.join)(__dirname, "../integrations/" + integrationInfo.integration + "/secrets.env")));
};
exports.readAirnodeSecrets = readAirnodeSecrets;
/**
 * @returns The contents of the "config.json" file for the current integration (throws if it doesn't exist)
 */
var readConfig = function () {
    var integrationInfo = (0, exports.readIntegrationInfo)();
    var config = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, "../integrations/" + integrationInfo.integration + "/config.json")).toString());
    return config;
};
exports.readConfig = readConfig;
/**
 * @param secrets The lines of the secrets file
 * @returns All the lines joined followed by a new line symbol
 */
var formatSecrets = function (secrets) { return secrets.join('\n') + '\n'; };
exports.formatSecrets = formatSecrets;
/**
 * @param filename
 * @returns The "filename" with the last extension removed
 */
var removeExtension = function (filename) { return filename.split('.')[0]; };
exports.removeExtension = removeExtension;
//# sourceMappingURL=utils.js.map