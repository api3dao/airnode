import { WorkerOptions } from '../../../src/types';
import { buildConfig } from './config';

export function buildWorkerOptions(options?: Partial<WorkerOptions>): WorkerOptions {
  return {
    coordinatorId: 'abcdefg',
    config: buildConfig(),
    providerIdShort: '19255a4',
    region: 'us-east-1',
    stage: 'test',
    ...options,
  };
}
