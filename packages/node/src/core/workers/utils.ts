import { config } from '../config';

export interface WorkerParameters {
  functionName: string;
  payload: any;
}

export function isLocalEnv() {
  return config.nodeSettings.cloudProvider.startsWith('local');
}
