import * as ora from 'ora';

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

function oraInstance(text?: string) {
  return debugModeFlag ? ora.default({ text, prefixText: () => new Date().toISOString() }) : ora.default(text);
}

export function succeed(text: string) {
  oraInstance().succeed(text);
}

export function fail(text: string) {
  oraInstance().fail(text);
}

export function warn(text: string) {
  oraInstance().warn(text);
}

export function info(text: string) {
  oraInstance().info(text);
}

export function debug(text: string) {
  if (debugModeFlag) oraInstance().info(text);
}

export function spinner(text: string) {
  return oraInstance(text).start();
}

export function debugSpinner(text: string) {
  return debugModeFlag ? spinner(text) : dummySpinner;
}

export function debugMode(mode: boolean) {
  debugModeFlag = mode;
}

export function inDebugMode() {
  return debugModeFlag;
}
