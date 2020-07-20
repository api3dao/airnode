import { ethers } from 'ethers';
import { decodeMap } from 'cbor-custom';
import * as logger from '../../../utils/logger';
import { ApiCallRequest, ApiRequestErrorCode, ProviderState } from '../../../../types';

function decodeParameters(state: ProviderState, request: ApiCallRequest): ApiCallRequest {
  if (!request.encodedParameters) {
    return request;
  }

  // It's unlikely that we'll be unable to parse the parameters that get sent
  // with the request, but just in case, wrap this in a try/catch.
  try {
    const parameters = decodeMap(request.encodedParameters);
    return { ...request, parameters };
  } catch (e) {
    const { requestId, encodedParameters } = request;
    const message = `Request ID:${requestId} submitted with invalid parameters: ${encodedParameters}`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);
    return { ...request, valid: false, errorCode: ApiRequestErrorCode.InvalidParameters };
  }
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

  const withParameters = decodeParameters(state, request);
  return withParameters;
}
