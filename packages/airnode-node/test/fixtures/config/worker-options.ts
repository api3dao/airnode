import { WorkerOptions } from '../../../src/types';

export function buildWorkerOptions(options?: Partial<WorkerOptions>): WorkerOptions {
  return {
    cloudProvider: {
      type: 'local',
      gatewayServerPort: 3000,
    },
    deploymentId: 'local02cce763',
    ...options,
  };
}
