import { formatDateTimeMs } from './utils/date-utils';
import { Config, LogLevel, LogOptions, PendingLog, LogMetadata } from './types';

const logLevels: { readonly [key in LogLevel]: number } = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export function buildBaseOptions(config: Config, meta: LogMetadata) {
  return {
    format: config.nodeSettings.logFormat,
    level: config.nodeSettings.logLevel,
    meta,
  };
}

export function debug(message: string, options: LogOptions) {
  log('DEBUG', message, options);
}

export function info(message: string, options: LogOptions) {
  log('INFO', message, options);
}

export function warn(message: string, options: LogOptions) {
  log('WARN', message, options);
}

export function error(message: string, options: LogOptions) {
  log('ERROR', message, options);
}

export function log(level: LogLevel, message: string, options: LogOptions) {
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
    if (level === 'ERROR' && options?.error && options.error.stack) {
      plain('ERROR', options.error.stack, options);
    }
    return;
  }

  json(level, message, options);
  if (level === 'ERROR' && options?.error && options.error.stack) {
    json('ERROR', options.error.stack, options);
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

  console.log(`[${timestamp}] ${level} ${paddedMsg} ${meta}${additional}`);
}

export function json(level: LogLevel, message: string, options: LogOptions) {
  const timestamp = formatDateTimeMs(new Date());
  const logObject = {
    timestamp,
    level,
    message,
    ...(options.meta || {}),
    ...(options.additional || {}),
  };
  console.log(JSON.stringify(logObject));
}

// NOTE: In many cases it is not ideal to pass the entire state in to a
// function just to have access to the provider name. This would tightly
// couple many parts of the application together. For this reason, functions
// can build up a list of "pending" logs and have them all output at once
// (from a higher level function).
export function pend(level: LogLevel, message: string, error?: Error | null): PendingLog {
  if (error) {
    return { error, level, message };
  }
  return { level, message };
}

export function logPending(pendingLogs: PendingLog[], options: LogOptions) {
  pendingLogs.forEach((pendingLog) => {
    log(pendingLog.level, pendingLog.message, { ...options, error: pendingLog.error });
  });
}
