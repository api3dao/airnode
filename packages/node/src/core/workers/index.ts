import * as aws from './cloud-platforms/aws';
import { NodeCloudProvider, WorkerParameters } from '../../types';

export function spawn(params: WorkerParameters): Promise<any> {
  switch (params.cloudProvider) {
    case 'aws':
      return aws.spawn(params);

    case 'local:aws':
      return aws.spawnLocal(params);
  }
}

export function isLocalEnv(cloudProvider: NodeCloudProvider) {
  return cloudProvider.startsWith('local');
}
