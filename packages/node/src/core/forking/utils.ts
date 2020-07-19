import { config } from '../config';

export interface ForkParameters {
  functionName: string;
  payload: any;
}

export function isLocal() {
  return config.nodeSettings.cloudProvider.startsWith('local');
}
