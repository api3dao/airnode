import { config } from '../config';
import { ForkParameters, isLocal } from './utils';
import * as aws from './cloud-platforms/aws';

export { ForkParameters, isLocal };

export function spawn(params: ForkParameters): Promise<any> {
  switch (config.nodeSettings.cloudProvider) {
    case 'aws':
      return aws.spawn(params);

    case 'local:aws':
      return aws.spawnLocal(params);
  }
}
