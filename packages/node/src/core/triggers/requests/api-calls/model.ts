import { ethers } from 'ethers';
import { tryDecodeParameters } from '../../shared/parameters';
import * as logger from '../../../utils/logger';
import { ApiCall, BaseRequest, ProviderState, RequestErrorCode } from '../../../../types';

function applyParameters(state: ProviderState, request: BaseRequest<ApiCall>): BaseRequest<ApiCall> {
  if (!request.encodedParameters) {
    return request;
  }

  const parameters = tryDecodeParameters(request.encodedParameters);
  if (parameters === null) {
    const { id, encodedParameters } = request;
    const message = `Request ID:${id} submitted with invalid parameters: ${encodedParameters}`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);
    return { ...request, valid: false, errorCode: RequestErrorCode.InvalidRequestParameters };
  }

  return { ...request, parameters };
}

export function initialize(state: ProviderState, log: ethers.utils.LogDescription): BaseRequest<ApiCall> {
  const request: BaseRequest<ApiCall> = {
    id: log.args.requestId,
    requesterAddress: log.args.requester,
    providerId: log.args.providerId,
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
