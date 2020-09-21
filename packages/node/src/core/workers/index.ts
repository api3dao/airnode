import { config } from '../config';
import { WorkerParameters, isLocalEnv } from './utils';
import * as aws from './cloud-platforms/aws';

export { WorkerParameters, isLocalEnv };

export function spawn(params: WorkerParameters): Promise<any> {
  switch (config.nodeSettings.cloudProvider) {
    case 'aws':
      return aws.spawn(params);

    case 'local:aws':
      return aws.spawnLocal(params);
  }
}
