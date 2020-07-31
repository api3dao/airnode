import { ethers } from 'ethers';
import * as logger from '../../utils/logger';
import { ClientRequest, GroupedProviderRequests, ProviderState, RequestErrorCode } from '../../../types';

function validateRequest<T>(state: ProviderState, request: ClientRequest<T>): ClientRequest<T> {
  // If the request is already invalid, we don't want to overwrite the error
  if (!request.valid) {
    return request;
  }

  // Check the request is not for the reserved wallet at index 0
  if (request.walletIndex === 0) {
    const message = `Request ID:${request.id} has reserved wallet index 0.`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);

    return { ...request, valid: false, errorCode: RequestErrorCode.ReservedWalletIndex };
  }

  // Check the request wallet has enough funds to be able to make transactions
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
