import { LogOptions } from '../../src/types';

export function buildLogOptions(params?: Partial<LogOptions>): LogOptions {
  return {
    format: 'plain',
    level: 'DEBUG',
    meta: {
      coordinatorId: '12345678',
      chainId: '3',
      chainType: 'evm',
      providerName: 'test-provider',
    },
    ...params,
  };
}
