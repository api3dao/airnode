import find from 'lodash/find';
import { buildBaseOptions, logger, randomHexString } from '@api3/airnode-utilities';
import * as wallet from '../evm/wallet';
import * as evm from '../evm';
import { AggregatedApiCall, HttpSignedDataApiCallSuccessResponse, ApiCallTemplateWithoutId } from '../types';
import { callApi } from '../api';
import { Config } from '../config';
import { getExpectedTemplateIdV1 } from '../evm/templates';

export async function processHttpSignedDataRequest(
  config: Config,
  endpointId: string,
  encodedParameters: string
): Promise<[Error, null] | [null, HttpSignedDataApiCallSuccessResponse]> {
  // Both "trigger" and "decodedParameters" are guaranteed to exist because validation is already performed in the
  // deployer handler
  const trigger = find(config.triggers.httpSignedData, ['endpointId', endpointId])!;
  const decodedParameters = evm.encoding.safeDecode(encodedParameters)!;

  const requestId = randomHexString(16);
  const logOptions = buildBaseOptions(config, { requestId });
  const airnodeAddress = wallet.getAirnodeWallet(config).address;

  const template: ApiCallTemplateWithoutId = {
    airnodeAddress,
    endpointId,
    encodedParameters,
  };
  const templateId = getExpectedTemplateIdV1(template);

  const aggregatedApiCall: AggregatedApiCall = {
    type: 'http-signed-data-gateway',
    id: requestId,
    endpointId,
    endpointName: trigger.endpointName,
    oisTitle: trigger.oisTitle,
    parameters: decodedParameters,
    templateId: templateId,
    template: {
      id: templateId,
      ...template,
    },
  };

  const [logs, response] = await callApi({ config, aggregatedApiCall });

  logger.logPending(logs, logOptions);

  if (!response.success) {
    const err = new Error(response.errorMessage || 'An unknown error occurred');
    return [err, null];
  }

  return [null, response as HttpSignedDataApiCallSuccessResponse];
}
