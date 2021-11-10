import { WorkerOptions } from '../../../src/types';

export function buildWorkerOptions(options?: Partial<WorkerOptions>): WorkerOptions {
  return {
    cloudProvider: {
      name: 'local',
    },
    airnodeAddressShort: '19255a4',
    stage: 'test',
    ...options,
  };
}
