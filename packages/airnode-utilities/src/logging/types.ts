export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogFormat = 'json' | 'plain';

export type LogMetadata = { [key: string]: string };

export interface LogOptions {
  readonly meta?: LogMetadata;
  readonly format: LogFormat;
  readonly level: LogLevel;
}

export interface ErrorLogOptions extends LogOptions {
  readonly error: Error | null;
}

export interface PendingLog {
  readonly error?: Error;
  readonly level: LogLevel;
  readonly message: string;
}

export interface LogConfig {
  nodeSettings: { logFormat: LogFormat; logLevel: LogLevel };
}

export type LogsData<T> = readonly [PendingLog[], T];
