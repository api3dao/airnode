import * as aws from './cloud-platforms/aws';
import { NodeCloudProvider, WorkerParameters, WorkerResponse } from '../../types';

export async function spawn(params: WorkerParameters): Promise<WorkerResponse> {
  // We need to know at compile time whether or not to include the
  // "local" handlers (which are just regular promised) as the file
  // has a hard dependency on config.json being present
  if (process.env.LOCAL_WORKERS === 'true') {
    const localHandlers = require('./local-handlers');
    return await localHandlers[params.functionName](params.payload);
  }

  switch (params.cloudProvider) {
    case 'aws':
      return aws.spawn(params);
  }
}

export function isLocalEnv(cloudProvider: NodeCloudProvider) {
  return cloudProvider.startsWith('local');
}
