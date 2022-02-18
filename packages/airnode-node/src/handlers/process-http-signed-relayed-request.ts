import find from 'lodash/find';
import * as wallet from '../evm/wallet';
import { AggregatedApiCall, Config, ApiCallSuccessResponse } from '../types';
import * as logger from '../logger';
import { callApi } from '../api';

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
  const aggregatedApiCall: AggregatedApiCall = {
    type: 'http-signed-relayed-gateway',
    id: requestId,
    airnodeAddress,
    endpointId,
    endpointName: trigger.endpointName,
    oisTitle: trigger.oisTitle,
    parameters,
  };

  const [logs, response] = await callApi({ config, aggregatedApiCall });

  logger.logPending(logs, logOptions);

  if (!response.success) {
    const err = new Error(response.errorMessage || 'An unknown error occurred');
    return [err, null];
  }

  return [null, response];
}
