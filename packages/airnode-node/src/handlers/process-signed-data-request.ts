import find from 'lodash/find';
import * as wallet from '../evm/wallet';
import { AggregatedApiCall, ApiCallSuccessResponse } from '../types';
import * as logger from '../logger';
import { callApi } from '../api';
import { Config } from '../config/types';
import { randomHexString } from '../utils';

export async function processSignedDataRequest(
  config: Config,
  endpointId: string,
  parameters: Record<string, string>
): Promise<[Error, null] | [null, ApiCallSuccessResponse]> {
  const trigger = find(config.triggers.signedData, ['endpointId', endpointId]);
  if (!trigger) {
    return [new Error(`Unable to find endpoint with ID:'${endpointId}'`), null];
  }

  const endpoints = find(config.ois, ['title', trigger.oisTitle])?.endpoints;
  const endpoint = find(endpoints, ['name', trigger.endpointName]);
  if (!endpoint) {
    return [new Error(`No endpoint definition for endpoint ID '${endpointId}'`), null];
  }

  // TODO: There should be an TS interface for required params
  if (!parameters._templateId) {
    return [
      new Error(`You must specify "_templateId" for the requestId/subscriptionId in the request parameters.`),
      null,
    ];
  }

  const requestId = randomHexString(16);
  const logOptions = logger.buildBaseOptions(config, { requestId });
  const airnodeAddress = wallet.getAirnodeWallet(config).address;
  const aggregatedApiCall: AggregatedApiCall = {
    type: 'signed-data-gateway',
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
