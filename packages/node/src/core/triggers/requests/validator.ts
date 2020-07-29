import { ethers } from 'ethers';
import * as logger from '../../utils/logger';
import { DirectRequest, GroupedProviderRequests, ProviderState, RequestErrorCode } from '../../../types';

function validateRequest<T>(state: ProviderState, request: DirectRequest<T>): DirectRequest<T> {
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

export function validateRequests(state: ProviderState, requests: GroupedProviderRequests): GroupedProviderRequests {
  const apiCalls = requests.apiCalls.map((a) => validateRequest(state, a));

  return {
    apiCalls,
    walletAuthorizations: [],
    withdrawals: [],
  };
}
