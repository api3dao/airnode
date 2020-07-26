import { ethers } from 'ethers';
import { tryDecodeParameters } from '../../shared/parameters';
import * as logger from '../../../utils/logger';
import { ApiCallRequest, ApiRequestErrorCode, ProviderState } from '../../../../types';

// These get added later after fetching requester details
type IgnoredFields = 'requesterId' | 'walletIndex' | 'walletAddress' | 'walletBalance' | 'walletMinimumBalance';
export type ApiCallInitialRequest = Omit<ApiCallRequest, IgnoredFields>;

function applyParameters(state: ProviderState, request: ApiCallInitialRequest): ApiCallInitialRequest {
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

export function initialize(state: ProviderState, log: ethers.utils.LogDescription): ApiCallInitialRequest {
  const request: ApiCallInitialRequest = {
    requestId: log.args.requestId,
    requesterAddress: log.args.requester,
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
