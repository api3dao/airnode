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
      switch (params.payload.functionName) {
        case 'initializeProvider':
          return localHandlers.initializeProvider(params.payload);
        case 'callApi':
          return localHandlers.callApi(params.payload);
        case 'processTransactions':
          return localHandlers.processTransactions(params.payload);
      }
  }
}
