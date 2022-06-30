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
  // Guaranteed to exist because validation is already performed in the deployer handler
  const trigger = find(config.triggers.http, ['endpointId', endpointId])!;

  const aggregatedApiCall: AggregatedApiCall = {
    type: 'http-gateway',
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

  return [null, response as HttpGatewayApiCallSuccessResponse];
}
