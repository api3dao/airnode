import { ErrorLogOptions, LogLevel, LogOptions, PendingLog } from './types';
import { formatDateTimeMs } from '../date';

let logOptions: LogOptions;

export const getLogOptions = () => {
  return logOptions;
};

export const setLogOptions = (newLogOptions: LogOptions) => {
  logOptions = newLogOptions;
};

const logLevels: { readonly [key in LogLevel]: number } = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export const logger = {
  options: 'test',
  log: (message: string, options: LogOptions = logOptions) => {
    if (options) {
      logFull('INFO', message, options);
      return;
    }
    consoleLog(message);
  },
  debug: (message: string, options: LogOptions = logOptions) => {
    if (options) {
      logFull('DEBUG', message, options);
      return;
    }
    consoleLog(message);
  },
  info: (message: string, options: LogOptions = logOptions) => {
    if (options) {
      logFull('INFO', message, options);
      return;
    }
    consoleLog(message);
  },
  warn: (message: string, options: LogOptions = logOptions) => {
    if (options) {
      logFull('WARN', message, options);
      return;
    }
    consoleLog(message);
  },
  error: (message: string, error: Error | null = null, options: LogOptions = logOptions) => {
    if (options) {
      logFull('ERROR', message, { ...options, error });
      return;
    }
    consoleLog(message);
  },
  logPending: (pendingLogs: PendingLog[], options?: Partial<LogOptions>) =>
    pendingLogs.forEach((pendingLog) => {
      if (pendingLog.error) {
        logFull(pendingLog.level, pendingLog.message, { ...logOptions, ...options, error: pendingLog.error });
      } else {
        logFull(pendingLog.level, pendingLog.message, { ...logOptions, ...options });
      }
    }),
  // NOTE: In many cases it is not ideal to pass the entire state in to a
  // function just to have access to the provider name. This would tightly
  // couple many parts of the application together. For this reason, functions
  // can build up a list of "pending" logs and have them all output at once
  // (from a higher level function).
  pend: (level: LogLevel, message: string, error?: Error | null): PendingLog => {
    if (error) {
      return { error, level, message };
    }
    return { level, message };
  },
};

export function logFull(level: LogLevel, message: string, options: LogOptions | ErrorLogOptions) {
  if (process.env.SILENCE_LOGGER) {
    return;
  }

  const systemLevel = logLevels[options.level];
  const messageLevel = logLevels[level];
  if (systemLevel > messageLevel) {
    return;
  }

  if (options.format === 'plain') {
    plain(level, message, options);
    if (level === 'ERROR' && (options as ErrorLogOptions).error?.stack) {
      plain('ERROR', (options as ErrorLogOptions).error!.stack!, options);
    }
    return;
  }

  json(level, message, options);
  if (level === 'ERROR' && (options as ErrorLogOptions).error!.stack!) {
    json('ERROR', (options as ErrorLogOptions).error!.stack!, options);
  }
}

export function plain(level: LogLevel, message: string, options: LogOptions) {
  const timestamp = formatDateTimeMs(new Date());
  const paddedMsg = message.padEnd(80);

  // The following are "special" fields that get spacing, capitalization etc applied
  // Additional fields can be included, but they must have the full name as the keys
  const chainType = options.meta?.chainType ? ` Chain:${options.meta.chainType.toUpperCase()}` : '';
  const chainId = options.meta?.chainId ? ` Chain-ID:${options.meta.chainId}` : '';
  const coordId = options.meta?.coordinatorId ? ` Coordinator-ID:${options.meta.coordinatorId}` : '';
  const provider = options.meta?.providerName ? ` Provider:${options.meta.providerName}` : '';
  const meta = [coordId, provider, chainType, chainId].filter((l) => !!l).join(',');

  const additional = Object.keys(options.additional || {}).reduce((acc, key) => {
    if (!options.additional || !options.additional[key]) {
      return acc;
    }
    return `${acc}, ${key}: ${options.additional[key]}`;
  }, '');

  consoleLog(`[${timestamp}] ${level} ${paddedMsg} ${meta}${additional}`);
}

export function json(level: LogLevel, message: string, options: LogOptions) {
  const timestamp = formatDateTimeMs(new Date());
  const logObject = {
    timestamp,
    level,
    message,
    ...options.meta,
    ...options.additional,
  };

  consoleLog(JSON.stringify(logObject));
}

export function consoleLog(message: string) {
  // eslint-disable-next-line no-console
  console.log(message);
}
