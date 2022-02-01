import * as aws from './cloud-platforms/aws';
import * as gcp from './cloud-platforms/gcp';
import * as localHandlers from './local-handlers';
import { WorkerParameters, WorkerResponse } from '../types';

export function spawn(params: WorkerParameters): Promise<WorkerResponse> {
  switch (params.cloudProvider.type) {
    case 'aws':
      return aws.spawn(params);

    case 'gcp':
      return gcp.spawn(params);

    case 'local':
      if (params.payload.functionName === 'initializeProvider') {
        return localHandlers.initializeProvider(params.payload);
      }
      if (params.payload.functionName === 'processProviderRequests') {
        return localHandlers.processProviderRequests(params.payload);
      }
      if (params.payload.functionName === 'callApi') {
        return localHandlers.callApi(params.payload);
      }

      throw new Error(`Invalid function name. ${params}'`);
  }
}
