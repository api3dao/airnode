import * as aws from './cloud-platforms/aws';
import * as localHandlers from './local-handlers';
import { WorkerParameters, WorkerResponse } from '../types';

export function spawn(params: WorkerParameters): Promise<WorkerResponse> {
  switch (params.cloudProvider.name) {
    case 'aws':
      return aws.spawn(params);

    case 'gcp':
      throw new Error('Not supported yet');

    case 'local':
      return localHandlers[params.functionName](params.payload);
  }
}
