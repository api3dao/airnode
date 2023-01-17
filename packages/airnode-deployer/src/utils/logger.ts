import fs from 'fs';
import * as ora from 'ora';
import { bold } from 'chalk';
import { format } from 'date-fns-tz';

export interface LoggerOptions {
  bold?: boolean;
}

let logsDirectory = 'config/logs';
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

function oraInstance(text?: string) {
  return debugModeFlag ? ora.default({ text, prefixText: () => new Date().toISOString() }) : ora.default(text);
}

export function writeLog(text: string) {
  const timestamp = format(Date.now(), 'yyyy-MM-dd HH:mm:ss');
  const sanitizedLogs = replaceSecrets(text, secrets);
  fs.appendFileSync(`${logsDirectory}/deployer-${logFileTimestamp}.log`, `${timestamp}: ${sanitizedLogs}\n`);
}

export function succeed(text: string) {
  writeLog(text);
  oraInstance().succeed(text);
}

export function fail(text: string, options?: LoggerOptions) {
  writeLog(text);
  oraInstance().fail(options?.bold ? bold(text) : text);
}

export function warn(text: string) {
  writeLog(text);
  const currentOra = getSpinner();
  if (currentOra.isSpinning) {
    currentOra.clear();
    currentOra.frame();
  }
  oraInstance().warn(text);
}

export function info(text: string) {
  writeLog(text);
  const currentOra = getSpinner();
  if (currentOra.isSpinning) {
    currentOra.clear();
    currentOra.frame();
  }
  oraInstance().info(text);
}

export function debug(text: string) {
  if (debugModeFlag) info(text);
}

export function debugSpinner(text: string) {
  writeLog(text);
  return debugModeFlag ? getSpinner().info(text) : dummySpinner;
}

export function debugMode(mode: boolean) {
  debugModeFlag = mode;
}

export function inDebugMode() {
  return debugModeFlag;
}

export function setSecret(secret: string) {
  secrets.push(secret);
}

export function replaceSecrets(input: string, secrets: string[]) {
  let output = input;
  secrets.forEach((secret) => (output = output.replace(secret, '*'.repeat(secret.length))));

  return output;
}

export function setLogsDirectory(path: string) {
  logsDirectory = path.endsWith('/') ? path.slice(0, -1) : path;
  if (!fs.existsSync(logsDirectory)) fs.mkdirSync(logsDirectory, { recursive: true });

  logFileTimestamp = format(Date.now(), 'yyyy-MM-dd_HH:mm:ss');
}
