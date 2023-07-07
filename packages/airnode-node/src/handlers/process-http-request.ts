import find from 'lodash/find';
import { logger } from '@api3/airnode-utilities';
import { BaseAggregatedApiCall, HttpGatewayApiCallSuccessResponse } from '../types';
import { callApi } from '../api';
import { Config } from '../config';

export async function processHttpRequest(
  config: Config,
  endpointId: string,
  parameters: Record<string, any>
): Promise<[Error, null] | [null, HttpGatewayApiCallSuccessResponse]> {
  // Guaranteed to exist because validation is already performed in the deployer handler
  const trigger = find(config.triggers.http, ['endpointId', endpointId])!;

  const aggregatedApiCall: BaseAggregatedApiCall = {
    endpointName: trigger.endpointName,
    oisTitle: trigger.oisTitle,
    parameters,
  };

  const [logs, response] = await callApi({ type: 'http-gateway', config, aggregatedApiCall });

  logger.logPending(logs);

  if (!response.success) {
    const err = new Error(response.errorMessage || 'An unknown error occurred');
    return [err, null];
  }

  return [null, response as HttpGatewayApiCallSuccessResponse];
}
