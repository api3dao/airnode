import { ethers } from 'ethers';
import { tryDecodeParameters } from '../../shared/parameters';
import * as logger from '../../../utils/logger';
import { ApiCallRequest, ApiRequestErrorCode, ProviderState } from '../../../../types';

// These get added later after fetching requester details
type IgnoredFields = 'requesterId' | 'walletIndex' | 'walletAddress' | 'walletBalance' | 'walletMinimumBalance';
export type ApiCallInitialRequest = Omit<ApiCallRequest, IgnoredFields>;

// We can't process requests with these errors, so they are ignored
export const UNPROCESSABLE_ERROR_CODES = [
  ApiRequestErrorCode.RequesterDataNotFound,
  ApiRequestErrorCode.InsufficientBalance,
];

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

export function validate(state: ProviderState, request: ApiCallRequest) {
  // If the request is already invalid, we don't want to overwrite the error
  if (!request.valid) {
    return request;
  }

  // Validation 1: Check the request wallet has enough funds to be able to make transactions
  if (request.walletBalance.lt(request.walletMinimumBalance)) {
    const currentBalance = ethers.utils.formatEther(request.walletBalance);
    const minBalance = ethers.utils.formatEther(request.walletMinimumBalance);
    const message = `Request ID:${request.requestId} wallet has insufficient balance of ${currentBalance} ETH. Minimum balance of ${minBalance} ETH is required.`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);

    return { ...request, valid: false, errorCode: ApiRequestErrorCode.InsufficientBalance };
  }

  return request;
}
