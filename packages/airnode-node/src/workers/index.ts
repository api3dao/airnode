import * as crypto from 'crypto';
import * as aws from './cloud-platforms/aws';
import * as gcp from './cloud-platforms/gcp';
import * as localHandlers from './local-handlers';
import { WorkerParameters, WorkerResponse } from '../types';
import { CloudProvider } from '../config';

const DEPLOYMENT_ID_LENGTH = 8;

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

function cloudProviderHashElements(cloudProvider: CloudProvider) {
  const hashElements = [cloudProvider.type, cloudProvider.region];
  if (cloudProvider.type === 'gcp') {
    hashElements.push(cloudProvider.projectId);
  }

  return hashElements;
}

export function deriveDeploymentId(
  cloudProvider: CloudProvider,
  airnodeAddress: string,
  stage: string,
  airnodeVersion: string
) {
  return `${cloudProvider.type}${crypto
    .createHash('sha256')
    .update([...cloudProviderHashElements(cloudProvider), airnodeAddress, stage, airnodeVersion].join(''))
    .digest('hex')
    .substring(0, DEPLOYMENT_ID_LENGTH)}`;
}

export function deriveDeploymentVersionId(
  cloudProvider: CloudProvider,
  airnodeAddress: string,
  stage: string,
  airnodeVersion: string,
  timestamp: string
) {
  return crypto
    .createHash('sha256')
    .update([...cloudProviderHashElements(cloudProvider), airnodeAddress, stage, airnodeVersion, timestamp].join(''))
    .digest('hex')
    .substring(0, DEPLOYMENT_ID_LENGTH);
}
