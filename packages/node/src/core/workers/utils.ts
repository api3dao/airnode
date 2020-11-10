import { Config, NodeCloudProvider } from '../../types';

export interface WorkerParameters {
  config: Config;
  functionName: string;
  payload: any;
}

export function isLocalEnv(cloudProvider: NodeCloudProvider) {
  return cloudProvider.startsWith('local');
}
