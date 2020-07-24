export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const logLevels: { [key in LogLevel]: number } = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export function log(message: string) {
  if (process.env.SILENCE_LOGGER) {
    return;
  }
  console.log(message);
}

export function logJSON(level: LogLevel, message: any) {
  // Set as lowercase. i.e. `export LOG_LEVEL=info`
  const LOG_LEVEL = process.env.LOG_LEVEL;

  if (LOG_LEVEL) {
    const systemLevel = logLevels[LOG_LEVEL.toUpperCase()];
    const messageLevel = logLevels[level];
    if (systemLevel > messageLevel) {
      return;
    }
  }

  log(JSON.stringify({ level, message }));
}

export function logProviderJSON(name: string, level: LogLevel, message: string) {
  logJSON(level, `[${name}] ${message}`);
}

export function logProviderError(name: string, message: string, err: Error | null) {
  logProviderJSON(name, 'ERROR', message);
  if (err && err.stack) {
    logProviderJSON(name, 'ERROR', err.stack);
  }
}
