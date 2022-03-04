import find from 'lodash/find';
import { buildBaseOptions, logger, randomHexString } from '@api3/airnode-utilities';
import * as wallet from '../evm/wallet';
import * as evm from '../evm';
import { AggregatedApiCall, ApiCallSuccessResponse, ApiCallTemplate } from '../types';
import { callApi } from '../api';
import { Config } from '../config/types';
import { getExpectedTemplateId } from '../evm/templates';

export async function processHttpSignedDataRequest(
  config: Config,
  endpointId: string,
  parameters: string
): Promise<[Error, null] | [null, ApiCallSuccessResponse]> {
  const trigger = find(config.triggers.httpSignedData, ['endpointId', endpointId]);
  if (!trigger) {
    return [new Error(`Unable to find endpoint with ID:'${endpointId}'`), null];
  }

  const endpoints = find(config.ois, ['title', trigger.oisTitle])?.endpoints;
  const endpoint = find(endpoints, ['name', trigger.endpointName]);
  const decodedParameters = evm.encoding.safeDecode(parameters);

  if (!endpoint) {
    return [new Error(`No endpoint definition for endpoint ID '${endpointId}'`), null];
  }

  // TODO: There should be an TS interface for required params
  if (!decodedParameters) {
    return [new Error(`Request contains invalid encodedParameters: ${parameters}`), null];
  }

  const requestId = randomHexString(16);
  const logOptions = buildBaseOptions(config, { requestId });
  const airnodeAddress = wallet.getAirnodeWallet(config).address;

  const template = <ApiCallTemplate>{
    airnodeAddress,
    endpointId,
    encodedParameters: parameters,
  };
  const templateId = getExpectedTemplateId(template);

  const aggregatedApiCall: AggregatedApiCall = {
    type: 'http-signed-data-gateway',
    id: requestId,
    airnodeAddress,
    endpointId,
    endpointName: trigger.endpointName,
    oisTitle: trigger.oisTitle,
    parameters: decodedParameters,
    templateId: templateId,
    template: {
      airnodeAddress,
      endpointId,
      id: templateId,
      encodedParameters: parameters,
    },
  };

  const [logs, response] = await callApi({ config, aggregatedApiCall });

  logger.logPending(logs, logOptions);

  if (!response.success) {
    const err = new Error(response.errorMessage || 'An unknown error occurred');
    return [err, null];
  }

  return [null, response];
}
