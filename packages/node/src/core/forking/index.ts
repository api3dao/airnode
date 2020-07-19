import { config } from '../config';
import { ForkParameters } from './utils';
import * as aws from './cloud-platforms/aws';

export function fork(params: ForkParameters): Promise<any> {
  switch (config.nodeSettings.cloudProvider) {
    case 'aws':
      return aws.fork(params);

    case 'local:aws':
      return aws.forkLocal(params);
  }
}
