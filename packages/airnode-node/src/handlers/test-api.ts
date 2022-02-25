import find from 'lodash/find';
import { buildBaseOptions, logger, randomHexString } from '@api3/airnode-utilities';
import * as wallet from '../evm/wallet';
import { AggregatedApiCall, Config, ApiCallSuccessResponse } from '../types';
import { callApi } from '../api';

export async function testApi(
  config: Config,
  endpointId: string,
  parameters: Record<string, string>
): Promise<[Error, null] | [null, ApiCallSuccessResponse]> {
  const testCallId = randomHexString(16);
  const airnodeAddress = wallet.getAirnodeWallet(config).address;

  const logOptions = buildBaseOptions(config, { requestId: testCallId });

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
    type: 'testing-gateway',
    id: testCallId,
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
