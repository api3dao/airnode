import fromPairs from 'lodash/fromPairs';
import * as logger from '../../utils/logger';
import { GroupedRequests, ProviderState, RequestErrorCode, RequestStatus } from '../../../types';

export function blockRequestsWithWithdrawals(state: ProviderState, requests: GroupedRequests): GroupedRequests {
  const withdrawalsByWalletIndex = fromPairs(requests.withdrawals.map((w) => [w.walletIndex, w]));

  const apiCalls = requests.apiCalls.reduce((acc, apiCall) => {
    const pendingWithdrawal = withdrawalsByWalletIndex[apiCall.walletIndex];

    if (pendingWithdrawal) {
      const message = `Discarding Request ID:${apiCall.id} as it has a pending Withdrawl ID:${pendingWithdrawal.id}`;
      logger.logProviderJSON(state.config.name, 'WARN', message);
      const blockedCall = { ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.PendingWithdrawal };
      return [...acc, blockedCall];
    }

    return [...acc, apiCall];
  }, []);

  return { ...requests, apiCalls };
}
