import { WorkerParameters } from './utils';
import * as aws from './cloud-platforms/aws';

export * from './utils';

export function spawn(params: WorkerParameters): Promise<any> {
  switch (params.config.nodeSettings.cloudProvider) {
    case 'aws':
      return aws.spawn(params);

    case 'local:aws':
      return aws.spawnLocal(params);
  }
}
