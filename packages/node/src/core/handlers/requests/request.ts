import { ethers } from 'ethers';
import { decodeMap } from 'cbor-custom';
import * as logger from '../../utils/logger';
import { ProviderState, Request, RequestErrorCode } from '../../../types';

function decodeParameters(state: ProviderState, request: Request): Request {
  if (!request.encodedParameters) {
    return request;
  }

  try {
    const parameters = decodeMap(request.encodedParameters);
    return { ...request, parameters };
  } catch (e) {
    const { requestId, encodedParameters } = request;
    const message = `Request ID:${requestId} submitted with invalid parameters: ${encodedParameters}`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);
    return { ...request, valid: false, errorCode: RequestErrorCode.InvalidParameters };
  }
}

export function initialize(state: ProviderState, log: ethers.utils.LogDescription): Request {
  const request: Request = {
    requestId: log.args.requestId,
    requester: log.args.requester,
    endpointId: log.args.endpointId || null,
    templateId: log.args.templateId || null,
    fulfillAddress: log.args.fulfillAddress,
    fulfillFunctionId: log.args.fulfillFunctionId,
    errorAddress: log.args.errorAddress,
    errorFunctionId: log.args.errorFunctionId,
    encodedParameters: log.args.parameters || null,
    valid: true,
    parameters: {},
  };

  const withParameters = decodeParameters(state, request);
  return withParameters;
}
