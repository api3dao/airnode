import fromPairs from 'lodash/fromPairs';
import * as logger from '../../../utils/logger';
import {
  ApiCall,
  ClientRequest,
  GroupedRequests,
  PendingLog,
  RequestErrorCode,
  RequestStatus,
} from '../../../../types';

interface ApiCallsWithLogs {
  apiCalls: ClientRequest<ApiCall>[];
  logs: PendingLog[];
}

export type LogsWithGroupedRequests = [PendingLog[], Error | null, GroupedRequests];

export function blockRequestsWithWithdrawals(requests: GroupedRequests): LogsWithGroupedRequests {
  const withdrawalsByWalletIndex = fromPairs(requests.withdrawals.map((w) => [w.walletIndex, w]));

  const initialState: ApiCallsWithLogs = { logs: [], apiCalls: [] };

  const apiCallsWithLogs = requests.apiCalls.reduce((acc, apiCall) => {
    const pendingWithdrawal = withdrawalsByWalletIndex[apiCall.walletIndex];

    if (pendingWithdrawal) {
      const warningLog = logger.pend(
        'WARN',
        `Ignoring Request ID:${apiCall.id} as it has a pending Withdrawl ID:${pendingWithdrawal.id}`
      );
      const blockedCall = { ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.PendingWithdrawal };
      return {
        ...acc,
        logs: [...acc.logs, warningLog],
        apiCalls: [...acc.apiCalls, blockedCall],
      };
    }

    return { ...acc, apiCalls: [...acc.apiCalls, apiCall] };
  }, initialState);

  const updatedRequests = { ...requests, apiCalls: apiCallsWithLogs.apiCalls };
  return [apiCallsWithLogs.logs, null, updatedRequests];
}
