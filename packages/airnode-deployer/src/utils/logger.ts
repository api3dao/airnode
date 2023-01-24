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
let spinner: ora.Ora;

export function getSpinner() {
  if (spinner) return spinner;

  spinner = oraInstance();
  return spinner;
}

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
  const currentOra = getSpinner();
  if (currentOra.isSpinning) {
    currentOra.clear();
    currentOra.frame();
  }
  oraInstance().warn(text);
}

export function info(text: string) {
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
  return debugModeFlag ? getSpinner().info(text) : dummySpinner;
}

export function debugMode(mode: boolean) {
  debugModeFlag = mode;
}

export function inDebugMode() {
  return debugModeFlag;
}
