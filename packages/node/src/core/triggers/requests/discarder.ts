import fromPairs from 'lodash/fromPairs';
import * as logger from '../../utils/logger';
import { ClientRequest, GroupedRequests, ProviderState, RequestErrorCode } from '../../../types';

// We can't process requests with these errors, so they are ignored
export const UNPROCESSABLE_CLIENT_ERROR_CODES = [
  RequestErrorCode.RequesterDataNotFound,
  RequestErrorCode.InsufficientBalance,
];

function discardClientRequests<T>(state: ProviderState, requests: ClientRequest<T>[]): ClientRequest<T>[] {
  return requests.reduce((acc, request) => {
    if (request.valid) {
      return [...acc, request];
    }

    if (request.errorCode && UNPROCESSABLE_CLIENT_ERROR_CODES.includes(request.errorCode)) {
      const message = `Discarding Request ID:${request.id} as it has unprocessable error code:${request.errorCode}`;
      logger.logProviderJSON(state.config.name, 'ERROR', message);
      return acc;
    }

    return [...acc, request];
  }, []);
}

export function discardUnprocessableRequests(
  state: ProviderState,
  requests: GroupedRequests
): GroupedRequests {
  const apiCalls = discardClientRequests(state, requests.apiCalls);
  const withdrawals = discardClientRequests(state, requests.withdrawals);

  return {
    ...requests,
    apiCalls,
    withdrawals,
  };
}

export function discardRequestsWithWithdrawals(state: ProviderState, requests: GroupedRequests): GroupedRequests {
  const withdrawalsByWalletIndex = fromPairs(requests.withdrawals.map((w) => [w.walletIndex, w]));

  const apiCalls = requests.apiCalls.reduce((acc, apiCall) => {
    const pendingWithdrawal = withdrawalsByWalletIndex[apiCall.walletIndex];

    if (pendingWithdrawal) {
      const message = `Discarding Request ID:${apiCall.id} as it has a pending Withdrawl ID:${pendingWithdrawal.id}`;
      logger.logProviderJSON(state.config.name, 'WARN', message);
      return acc;
    }

    return [...acc, apiCall];
  }, []);

  return { ...requests, apiCalls };
}
