import omit from 'lodash/omit';
import { LogLevel, LogOptions, ErrorLogOptions, PendingLog, LogMetadata } from './types';
import { formatDateTimeMs } from '../date';

let logOptions: LogOptions | undefined;

export const getLogOptions = () => {
  return logOptions;
};

export const setLogOptions = (newLogOptions: LogOptions) => {
  logOptions = newLogOptions;
};

export const addMetadata = (meta: LogMetadata) => {
  if (!logOptions) return;

  logOptions = {
    ...logOptions,
    meta: { ...logOptions.meta, ...meta },
  };
};

export const removeMetadata = (metaKeys: string[]) => {
  if (!logOptions) return;

  logOptions = {
    ...logOptions,
    meta: omit(logOptions.meta, metaKeys),
  };
};

const logLevels: { readonly [key in LogLevel]: number } = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export const logger = {
  log: (message: string, options: LogOptions | undefined = logOptions) => {
    if (options) {
      logFull('INFO', message, options);
      return;
    }
    consoleLog(message);
  },
  debug: (message: string, options: LogOptions | undefined = logOptions) => {
    if (options) {
      logFull('DEBUG', message, options);
      return;
    }
    consoleLog(message);
  },
  info: (message: string, options: LogOptions | undefined = logOptions) => {
    if (options) {
      logFull('INFO', message, options);
      return;
    }
    consoleLog(message);
  },
  warn: (message: string, options: LogOptions | undefined = logOptions) => {
    if (options) {
      logFull('WARN', message, options);
      return;
    }
    consoleLog(message);
  },
  error: (message: string, error: Error | null = null, options: LogOptions | undefined = logOptions) => {
    if (options) {
      logFull('ERROR', message, { ...options, error });
      return;
    }
    if (error) consoleLog(message, error);
    else consoleLog(message);
  },
  logPending: (pendingLogs: PendingLog[], options?: Partial<LogOptions>) =>
    pendingLogs.forEach((pendingLog) => {
      if (!logOptions) {
        consoleLog(pendingLog.message);
        return;
      }

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
  if (process.env.SILENCE_LOGGER) return;

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
  if (level === 'ERROR' && (options as ErrorLogOptions).error?.stack) {
    json('ERROR', (options as ErrorLogOptions).error!.stack!, options);
  }
}

function formatMetadataField(meta: LogMetadata, key: string) {
  return `${key}:${meta[key]}`;
}

export function formatMetadata(meta: LogMetadata) {
  return Object.keys(meta)
    .map((key) => formatMetadataField(meta!, key))
    .join(', ');
}

export function plain(level: LogLevel, message: string, options: LogOptions) {
  const timestamp = formatDateTimeMs(new Date());
  const paddedMsg = message.padEnd(80);

  const metadata = formatMetadata(options.meta ?? {});
  consoleLog(`[${timestamp}] ${level} ${paddedMsg} ${metadata}`);
}

export function json(level: LogLevel, message: string, options: LogOptions) {
  const timestamp = formatDateTimeMs(new Date());
  const logObject = {
    timestamp,
    level,
    message,
    ...options.meta,
  };

  consoleLog(JSON.stringify(logObject));
}

export function consoleLog(...args: any[]) {
  if (process.env.SILENCE_LOGGER) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}
