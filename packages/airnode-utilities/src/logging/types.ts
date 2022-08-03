export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogFormat = 'json' | 'plain';

export interface LogMetadata {
  readonly coordinatorId?: string;
  readonly chainId?: string;
  readonly chainType?: 'evm';
  readonly providerName?: string;
  readonly requestId?: string;
}

export interface LogOptions {
  readonly additional?: any;
  readonly format: LogFormat;
  readonly level: LogLevel;
  readonly meta?: LogMetadata;
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
