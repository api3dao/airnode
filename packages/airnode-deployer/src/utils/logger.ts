import fs from 'fs';
import path from 'path';
import * as ora from 'ora';
import { bold } from 'chalk';
import { format } from 'date-fns-tz';
import { goSync } from '@api3/promise-utils';
import { consoleLog as utilsConsoleLog } from '@api3/airnode-utilities';

export const ANSI_REGEX = new RegExp(/\033\[([0-9]{1,2}(;[0-9]{1,2})?)?[m|K]/g);

export type OraMethod = 'start' | 'succeed' | 'fail' | 'info' | 'stop' | 'warn';
export interface LoggerOptions {
  bold?: boolean;
  secrets?: boolean;
}

let logsDirectory: string;
let logFileTimestamp: string;
const secrets: string[] = [];

let debugModeFlag = false;
const dummySpinner: ora.Ora = {
  ...ora.default(),
  start: (_text?: string) => dummySpinner,
  stop: () => dummySpinner,
  succeed: (_text?: string) => dummySpinner,
  fail: (_text?: string) => dummySpinner,
  warn: (_text?: string) => dummySpinner,
  info: (_text?: string) => dummySpinner,
  stopAndPersist: (_options?: ora.PersistOptions) => dummySpinner,
  frame: () => '',
  clear: () => dummySpinner,
  render: () => dummySpinner,
};
let spinner: ora.Ora;

export function getSpinner() {
  if (spinner) return spinner;

  spinner = oraInstance();
  return spinner;
}

export function useSpinner(method: OraMethod, text?: string, options?: LoggerOptions) {
  if (text) writeLog(text, options);
  getSpinner()[method](text);
}

function oraInstance(text?: string) {
  return debugModeFlag ? ora.default({ text, prefixText: () => new Date().toISOString() }) : ora.default(text);
}

export function writeLog(text: string, options?: LoggerOptions) {
  if (!logsDirectory) throw new Error('Missing log file directory.');

  const safeText = options?.secrets ? replaceSecrets(text, secrets) : text;
  // Strip ANSI characters to write tables to log files correctly and add new line
  const sanitizedLogs = ANSI_REGEX.test(safeText) ? '\n' + safeText.replace(ANSI_REGEX, '') : safeText;
  fs.appendFileSync(
    path.join(logsDirectory, `deployer-${logFileTimestamp}.log`),
    `${new Date().toISOString()}: ${sanitizedLogs}\n`
  );
}

export function succeed(text: string, options?: LoggerOptions) {
  writeLog(text, options);
  oraInstance().succeed(text);
}

export function fail(text: string, options?: LoggerOptions) {
  writeLog(text, options);
  oraInstance().fail(options?.bold ? bold(text) : text);
}

export function warn(text: string, options?: LoggerOptions) {
  writeLog(text, options);
  const currentOra = getSpinner();
  if (currentOra.isSpinning) {
    currentOra.clear();
    currentOra.frame();
  }
  oraInstance().warn(text);
}

export function info(text: string, options?: LoggerOptions) {
  writeLog(text, options);
  const currentOra = getSpinner();
  if (currentOra.isSpinning) {
    currentOra.clear();
    currentOra.frame();
  }
  oraInstance().info(text);
}

export function debug(text: string, options?: LoggerOptions) {
  if (debugModeFlag) {
    info(text);
  } else {
    writeLog(text, options);
  }
}

export function getDebugSpinner(text: string, options?: LoggerOptions) {
  writeLog(text, options);
  return debugModeFlag ? getSpinner().info(text) : dummySpinner;
}

export function useDebugSpinner(method: OraMethod | null, text?: string, options?: LoggerOptions) {
  if (debugModeFlag) {
    useSpinner(method || 'info', text, options);
    return;
  }

  if (text) writeLog(text, options);
  if (method) dummySpinner[method](text);
}

export function debugMode(mode: boolean) {
  debugModeFlag = mode;
}

export function consoleLog(text: string, options?: LoggerOptions) {
  writeLog(text, options);
  utilsConsoleLog(text);
}

export function inDebugMode() {
  return debugModeFlag;
}

export function setSecret(secret: string) {
  secrets.push(secret);
}

export function replaceSecrets(input: string, secrets: string[]) {
  let output = input;
  secrets.forEach((secret) => (output = output.replace(secret, '***')));

  return output;
}

export function setLogsDirectory(path: string) {
  logsDirectory = path;

  const goOutputWritable = goSync(() => fs.accessSync(logsDirectory, fs.constants.W_OK));
  if (!goOutputWritable.success) {
    const goMkdir = goSync(() => fs.mkdirSync(logsDirectory, { recursive: true }));
    if (!goMkdir.success) throw new Error(`Failed to create logs output directory. Error: ${goMkdir.error}.`);
  }

  logFileTimestamp = format(Date.now(), 'yyyy-MM-dd_HH:mm:ss');
}
