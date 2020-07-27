import { ethers } from 'ethers';
import { tryDecodeParameters } from '../../shared/parameters';
import * as logger from '../../../utils/logger';
import { ApiCall, ExtendedRegularRequest, ProviderState, RegularRequest, RequestErrorCode } from '../../../../types';

// We can't process requests with these errors, so they are ignored
export const UNPROCESSABLE_ERROR_CODES = [
  RequestErrorCode.RequesterDataNotFound,
  RequestErrorCode.InsufficientBalance,
];

function applyParameters(state: ProviderState, request: RegularRequest<ApiCall>): RegularRequest<ApiCall> {
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

export function initialize(state: ProviderState, log: ethers.utils.LogDescription): RegularRequest<ApiCall> {
  const request: RegularRequest<ApiCall> = {
    id: log.args.requestId,
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

export function validate(state: ProviderState, request: ExtendedRegularRequest<ApiCall>): ExtendedRegularRequest<ApiCall> {
  // If the request is already invalid, we don't want to overwrite the error
  if (!request.valid) {
    return request;
  }

  // Validation 1: Check the request wallet has enough funds to be able to make transactions
  if (request.walletBalance.lt(request.walletMinimumBalance)) {
    const currentBalance = ethers.utils.formatEther(request.walletBalance);
    const minBalance = ethers.utils.formatEther(request.walletMinimumBalance);
    const message = `Request ID:${request.id} wallet has insufficient balance of ${currentBalance} ETH. Minimum balance of ${minBalance} ETH is required.`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);

    return { ...request, valid: false, errorCode: RequestErrorCode.InsufficientBalance };
  }

  return request;
}
