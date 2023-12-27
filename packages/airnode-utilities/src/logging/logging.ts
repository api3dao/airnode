import omit from 'lodash/omit';
import { logLevelOptions, createLogger } from '@api3/commons';
import { z } from 'zod';
import { LogLevel, LogOptions, ErrorLogOptions, PendingLog, LogMetadata } from './types';

let logOptions: LogOptions | undefined;

const logLevelSchema = z.enum(logLevelOptions);

const externalJsonLogger = createLogger({
  colorize: !!process.env.LOG_COLORIZE,
  enabled: !!process.env.LOGGER_ENABLED,
  minLevel: logLevelSchema.parse(process.env.LOG_LEVEL ?? 'info'),
  format: 'json',
});

const externalTextLogger = createLogger({
  colorize: !!process.env.LOG_COLORIZE,
  enabled: !!process.env.LOGGER_ENABLED,
  minLevel: logLevelSchema.parse(process.env.LOG_LEVEL ?? 'info'),
  format: 'pretty',
});

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
    externalTextLogger.info(message, options);
  },
  debug: (message: string, options: LogOptions | undefined = logOptions) => {
    if (options) {
      logFull('DEBUG', message, options);
      return;
    }
    externalTextLogger.debug(message);
  },
  info: (message: string, options: LogOptions | undefined = logOptions) => {
    if (options) {
      logFull('INFO', message, options);
      return;
    }
    externalTextLogger.info(message);
  },
  warn: (message: string, options: LogOptions | undefined = logOptions) => {
    if (options) {
      logFull('WARN', message, options);
      return;
    }
    externalTextLogger.warn(message);
  },
  error: (message: string, error: Error | null = null, options: LogOptions | undefined = logOptions) => {
    if (options) {
      logFull('ERROR', message, { ...options, error });
      return;
    }
    if (error) externalTextLogger.error(message, error);
    else externalTextLogger.error(message);
  },
  logPending: (pendingLogs: PendingLog[], options?: Partial<LogOptions>) =>
    pendingLogs.forEach((pendingLog) => {
      if (!logOptions) {
        externalTextLogger.info(pendingLog.message);
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
  externalTextLogger[logLevelSchema.parse(level.toLocaleLowerCase())](message, options.meta);
}

export function json(level: LogLevel, message: string, options: LogOptions) {
  // TODO two loggers?
  externalJsonLogger[logLevelSchema.parse(level.toLocaleLowerCase())](message, options.meta);
}

export function consoleLog(...args: any[]) {
  if (process.env.SILENCE_LOGGER) return;
  externalTextLogger.info(args.join(' '));
}
