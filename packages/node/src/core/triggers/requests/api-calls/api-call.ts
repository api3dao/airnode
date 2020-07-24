import { ethers } from 'ethers';
import { tryDecodeParameters } from './parameters';
import * as logger from '../../../utils/logger';
import { ApiCallRequest, ApiRequestErrorCode, ProviderState } from '../../../../types';

function applyParameters(state: ProviderState, request: ApiCallRequest): ApiCallRequest {
  if (!request.encodedParameters) {
    return request;
  }

  const parameters = tryDecodeParameters(request.encodedParameters);
  if (parameters === null) {
    const { requestId, encodedParameters } = request;
    const message = `Request ID:${requestId} submitted with invalid parameters: ${encodedParameters}`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);
    return { ...request, valid: false, errorCode: ApiRequestErrorCode.InvalidRequestParameters };
  }

  return { ...request, parameters };
}

export function initialize(state: ProviderState, log: ethers.utils.LogDescription): ApiCallRequest {
  const request: ApiCallRequest = {
    requestId: log.args.requestId,
    requester: log.args.requester,
    endpointId: log.args.endpointId || null,
    templateId: log.args.templateId || null,
    fulfillAddress: log.args.fulfillAddress,
    fulfillFunctionId: log.args.fulfillFunctionId,
    errorAddress: log.args.errorAddress,
    errorFunctionId: log.args.errorFunctionId,
    encodedParameters: log.args.parameters,
    valid: true,
    parameters: {},
  };

  const withParameters = applyParameters(state, request);
  return withParameters;
}
