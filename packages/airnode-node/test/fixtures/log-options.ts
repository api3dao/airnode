import { LogOptions } from '@api3/airnode-utilities';

export function buildLogOptions(params?: Partial<LogOptions>): LogOptions {
  return {
    format: 'plain',
    level: 'DEBUG',
    meta: {
      'Coordinator-ID': '12345678',
    },
    ...params,
  };
}
