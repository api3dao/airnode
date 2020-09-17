import { LogLevel, PendingLog } from '../../types';

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
  logJSON(level, `[provider: ${name}] ${message}`);
}

// NOTE: In many cases it is not ideal to pass the entire state in to a
// function just to have access to the provider name. This would tightly
// couple many parts of the application together. For this reason, functions
// can build up a list of "pending" logs and have them all output at once
// (from a higher level function).
export function logPendingMessages(name: string, pendingLogs: PendingLog[]) {
  pendingLogs.forEach((pendingLog) => {
    logProviderJSON(name, pendingLog.level, pendingLog.message);

    if (pendingLog.error && pendingLog.error.stack) {
      logProviderJSON(name, 'ERROR', pendingLog.error.stack);
    }
  });
}

export function pend(level: LogLevel, message: string, error?: Error | null): PendingLog {
  if (error) {
    return { error, level, message };
  }
  return { level, message };
}

export function logProviderError(name: string, message: string, err: Error | null) {
  logProviderJSON(name, 'ERROR', message);
  if (err && err.stack) {
    logProviderJSON(name, 'ERROR', err.stack);
  }
}
