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
var main = function () { return __awaiter(void 0, void 0, void 0, function () {
    var integrationInfo, awsSecrets, questions, response, airnodeSecrets;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                integrationInfo = (0, src_1.readIntegrationInfo)();
                if (integrationInfo.airnodeType !== 'aws') {
                    src_1.cliPrint.error('You only need to run this script if you want to deploy Airnode on AWS');
                    return [2 /*return*/];
                }
                awsSecrets = (0, fs_1.existsSync)((0, path_1.join)(__dirname, '../aws.env')) ? (0, src_1.readAwsSecrets)() : null;
                questions = [
                    {
                        type: 'text',
                        name: 'accessKeyId',
                        message: [
                            'In order to deploy to AWS, your access and secret keys are required.',
                            'Secrets and keys you enter here will remain on your machine and will not be uploaded anywhere.',
                            '',
                            'See video how to create these: https://www.youtube.com/watch?v=KngM5bfpttA',
                            '',
                            'Enter AWS access key ID',
                        ].join('\n'),
                        initial: awsSecrets === null || awsSecrets === void 0 ? void 0 : awsSecrets.AWS_ACCESS_KEY_ID,
                    },
                    {
                        type: 'text',
                        name: 'secretAccessKey',
                        message: 'Enter AWS secret access key',
                        initial: awsSecrets === null || awsSecrets === void 0 ? void 0 : awsSecrets.AWS_SECRET_ACCESS_KEY,
                    },
                    {
                        type: 'text',
                        name: 'sessionToken',
                        message: '(Optional) Enter AWS session token',
                        initial: awsSecrets === null || awsSecrets === void 0 ? void 0 : awsSecrets.AWS_SESSION_TOKEN,
                    },
                ];
                return [4 /*yield*/, (0, prompts_1.default)(questions)];
            case 1:
                response = _a.sent();
                airnodeSecrets = [
                    "# This file was generated by: " + (0, path_1.relative)(__dirname, __filename),
                    '# ',
                    '# For further information see:',
                    '# https://docs.api3.org/airnode/next/grp-providers/guides/build-an-airnode/deploying-airnode.html#creating-cloud-credentials',
                    "AWS_ACCESS_KEY_ID=" + response.accessKeyId,
                    "AWS_SECRET_ACCESS_KEY=" + response.secretAccessKey,
                    "AWS_SESSION_TOKEN=" + response.sessionToken,
                ];
                (0, fs_1.writeFileSync)((0, path_1.join)(__dirname, '../aws.env'), (0, src_1.formatSecrets)(airnodeSecrets));
                src_1.cliPrint.info("An 'aws.env' file with the required credentials has been created.");
                return [2 /*return*/];
        }
    });
}); };
(0, src_1.runAndHandleErrors)(main);
//# sourceMappingURL=create-aws-secrets.js.map