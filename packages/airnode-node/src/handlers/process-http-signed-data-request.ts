import find from 'lodash/find';
import { buildBaseOptions, logger, randomHexString } from '@api3/airnode-utilities';
import * as wallet from '../evm/wallet';
import { AggregatedApiCall, ApiCallSuccessResponse } from '../types';
import { callApi } from '../api';
import { Config } from '../config/types';

export async function processHttpSignedDataRequest(
  config: Config,
  endpointId: string,
  parameters: Record<string, string>
): Promise<[Error, null] | [null, ApiCallSuccessResponse]> {
  const trigger = find(config.triggers.httpSignedData, ['endpointId', endpointId]);
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
  const logOptions = buildBaseOptions(config, { requestId });
  const airnodeAddress = wallet.getAirnodeWallet(config).address;
  const aggregatedApiCall: AggregatedApiCall = {
    type: 'http-signed-data-gateway',
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
