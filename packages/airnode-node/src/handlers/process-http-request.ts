import find from 'lodash/find';
import * as wallet from '../evm/wallet';
import { randomHexString } from '../utils/string-utils';
import { AggregatedApiCall, ApiCallSuccessResponse } from '../types';
import * as logger from '../logger';
import { callApi } from '../api';
import { Config } from '../config/types';

export async function processHttpRequest(
  config: Config,
  endpointId: string,
  // TODO: This should be typed as Record<string, string | undefined>
  parameters: Record<string, string>
): Promise<[Error, null] | [null, ApiCallSuccessResponse]> {
  const requestId = randomHexString(16);
  const airnodeAddress = wallet.getAirnodeWallet(config).address;

  const logOptions = logger.buildBaseOptions(config, { requestId });

  const httpTrigger = find(config.triggers.http, ['endpointId', endpointId]);
  if (!httpTrigger) {
    return [new Error(`Unable to find endpoint with ID:'${endpointId}'`), null];
  }

  const endpoints = find(config.ois, ['title', httpTrigger.oisTitle])?.endpoints;
  const endpoint = find(endpoints, ['name', httpTrigger.endpointName]);

  if (!endpoint) {
    return [new Error(`No endpoint definition for endpoint ID '${endpointId}'`), null];
  }

  const aggregatedApiCall: AggregatedApiCall = {
    type: 'http-gateway',
    id: requestId,
    airnodeAddress,
    endpointId,
    endpointName: httpTrigger.endpointName,
    oisTitle: httpTrigger.oisTitle,
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
