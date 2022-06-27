import find from 'lodash/find';
import { buildBaseOptions, logger, randomHexString } from '@api3/airnode-utilities';
import { AggregatedApiCall, HttpGatewayApiCallSuccessResponse } from '../types';
import { callApi } from '../api';
import { Config } from '../config';

export async function processHttpRequest(
  config: Config,
  endpointId: string,
  parameters: Record<string, string>
): Promise<[Error, null] | [null, HttpGatewayApiCallSuccessResponse]> {
  const requestId = randomHexString(16);
  const logOptions = buildBaseOptions(config, { requestId });

  const httpTrigger = find(config.triggers.http, ['endpointId', endpointId]);
  if (!httpTrigger) {
    return [new Error(`Unable to find endpoint with ID:'${endpointId}'`), null];
  }

  const aggregatedApiCall: AggregatedApiCall = {
    type: 'http-gateway',
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

  return [null, response as HttpGatewayApiCallSuccessResponse];
}
