import find from 'lodash/find';
import { logger, randomHexString } from '@api3/airnode-utilities';
import * as wallet from '../evm/wallet';
import * as evm from '../evm';
import {
  HttpSignedDataApiCallSuccessResponse,
  ApiCallTemplateWithoutId,
  HttpSignedDataAggregatedApiCall,
} from '../types';
import { callApi } from '../api';
import { Config } from '../config';
import { getExpectedTemplateIdV1 } from '../evm/templates';

export async function processHttpSignedDataRequest(
  config: Config,
  endpointId: string,
  encodedParameters: string
): Promise<[Error, null] | [null, HttpSignedDataApiCallSuccessResponse]> {
  const requestId = randomHexString(16);

  // Both "trigger" and "decodedParameters" are guaranteed to exist because validation is already performed in the
  // deployer handler
  const trigger = find(config.triggers.httpSignedData, ['endpointId', endpointId])!;
  const decodedParameters = evm.encoding.safeDecode(encodedParameters)!;
  const airnodeAddress = wallet.getAirnodeWalletFromPrivateKey().address;

  const template: ApiCallTemplateWithoutId = {
    airnodeAddress,
    endpointId,
    encodedParameters,
  };
  const templateId = getExpectedTemplateIdV1(template);

  const aggregatedApiCall: HttpSignedDataAggregatedApiCall = {
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

  const [logs, response] = await callApi({ type: 'http-signed-data-gateway', config, aggregatedApiCall });

  logger.logPending(logs);

  if (!response.success) {
    const err = new Error(response.errorMessage || 'An unknown error occurred');
    return [err, null];
  }

  return [null, response as HttpSignedDataApiCallSuccessResponse];
}
