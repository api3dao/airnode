import find from 'lodash/find';
import * as wallet from '../evm/wallet';
import { AggregatedApiCall, Config, WorkerOptions, ApiCallSuccessResponse } from '../types';
import * as logger from '../logger';
import { go } from '../utils/promise-utils';
import { spawnNewApiCall } from '../adapters/http/worker';
import { WORKER_CALL_API_TIMEOUT } from '../constants';

export async function processHttpSignedRelayedRequest(
  config: Config,
  endpointId: string,
  // TODO: This should be typed as Record<string, string | undefined>
  parameters: Record<string, string>
): Promise<[Error, null] | [null, ApiCallSuccessResponse]> {
  const trigger = find(config.triggers.httpSignedRelayed, ['endpointId', endpointId]);
  if (!trigger) {
    return [new Error(`Unable to find endpoint with ID:'${endpointId}'`), null];
  }

  const endpoints = find(config.ois, ['title', trigger.oisTitle])?.endpoints;
  const endpoint = find(endpoints, ['name', trigger.endpointName]);
  if (!endpoint) {
    return [new Error(`No endpoint definition for endpoint ID '${endpointId}'`), null];
  }

  // Check that the required relayer parameters have been supplied
  // TODO: There should be an TS interface for required params
  if (!parameters._id) {
    return [new Error(`You must specify "id" for the requestId/subscriptionId in the request parameters.`), null];
  }
  if (!parameters._relayer) {
    return [new Error(`You must specify "relayer" address in the request parameters.`), null];
  }

  const requestId = parameters._id;
  const logOptions = logger.buildBaseOptions(config, { requestId });
  const airnodeAddress = wallet.getAirnodeWallet(config).address;
  const workerOpts: WorkerOptions = {
    cloudProvider: config.nodeSettings.cloudProvider,
    airnodeAddressShort: wallet.getAirnodeAddressShort(airnodeAddress),
    stage: config.nodeSettings.stage,
  };
  const aggregatedApiCall: AggregatedApiCall = {
    type: 'http-signed-relayed-gateway',
    id: requestId,
    airnodeAddress,
    endpointId,
    endpointName: trigger.endpointName,
    oisTitle: trigger.oisTitle,
    parameters,
  };

  const [err, logData] = await go(() => spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts), {
    timeoutMs: WORKER_CALL_API_TIMEOUT,
  });

  const resLogs = logData ? logData[0] : [];
  logger.logPending(resLogs, logOptions);

  if (err || !logData || !logData[1]?.success) {
    return [err || new Error('An unknown error occurred'), null];
  }

  return [null, logData[1]];
}
