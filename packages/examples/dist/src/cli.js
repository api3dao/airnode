"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cliPrint = exports.runShellCommand = exports.runAndHandleErrors = void 0;
var child_process_1 = require("child_process");
var chalk_1 = __importDefault(require("chalk"));
/**
 * Executes the function passed as an argument and properly shuts down the node environment.
 *
 * Any uncaught error or promise rejection will be printed out in the console.
 */
var runAndHandleErrors = function (fn) {
    try {
        fn()
            .then(function () { return process.exit(0); })
            .catch(function (error) {
            exports.cliPrint.error(error);
            process.exit(1);
        });
    }
    catch (error) {
        exports.cliPrint.error('' + error);
        process.exit(1);
    }
};
exports.runAndHandleErrors = runAndHandleErrors;
/**
 * Run the command passed as an argument in the current shell and stream the output of the command in the CLI.
 */
var runShellCommand = function (command) {
    exports.cliPrint.info(command);
    (0, child_process_1.spawnSync)(command, {
        shell: true,
        stdio: 'inherit',
    });
};
exports.runShellCommand = runShellCommand;
exports.cliPrint = {
    info: function (text) { return console.log(chalk_1.default.bold.white(text)); },
    warning: function (text) { return console.log(chalk_1.default.bold.hex('#FFA500')(text)); },
    error: function (text) { return console.log(chalk_1.default.bold.red(text)); },
};
//# sourceMappingURL=cli.js.map