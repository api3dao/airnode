import * as aws from './cloud-platforms/aws';
import * as localHandlers from './local-handlers';
import { WorkerParameters, WorkerResponse } from '../../types';

export async function spawn(params: WorkerParameters): Promise<WorkerResponse> {
  if (isLocalEnv()) {
    return await localHandlers[params.functionName](params.payload);
  }

  switch (params.cloudProvider) {
    case 'aws':
      return aws.spawn(params);
  }
}

export function isLocalEnv() {
  return process.env.LOCAL_WORKERS === 'true';
}
