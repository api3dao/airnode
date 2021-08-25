import fromPairs from 'lodash/fromPairs';
import * as logger from '../../logger';
import { ApiCall, Request, GroupedRequests, LogsData, PendingLog, RequestErrorCode, RequestStatus } from '../../types';

interface ApiCallsWithLogs {
  readonly apiCalls: Request<ApiCall>[];
  readonly logs: PendingLog[];
}

export function blockRequestsWithWithdrawals(requests: GroupedRequests): LogsData<GroupedRequests> {
  const pendingApiCalls = requests.apiCalls.filter((r) => r.status === RequestStatus.Pending);
  const pendingWithdrawals = requests.withdrawals.filter((r) => r.status === RequestStatus.Pending);

  const withdrawalsBySponsorAddress = fromPairs(pendingWithdrawals.map((w) => [w.sponsorAddress, w]));

  const initialState: ApiCallsWithLogs = { logs: [], apiCalls: [] };

  const { logs, apiCalls } = pendingApiCalls.reduce((acc, apiCall) => {
    const pendingWithdrawal = withdrawalsBySponsorAddress[apiCall.sponsorAddress];

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

  const updatedRequests = { ...requests, apiCalls };
  return [logs, updatedRequests];
}
