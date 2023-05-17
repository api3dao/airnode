import keyBy from 'lodash/keyBy';
import { logger, PendingLog } from '@api3/airnode-utilities';
import { ApiCall, Request, GroupedRequests, LogsData } from '../../types';

interface ApiCallsWithLogs {
  readonly apiCalls: Request<ApiCall>[];
  readonly logs: PendingLog[];
}

export function blockRequestsWithWithdrawals([
  prevLogs,
  requests,
]: LogsData<GroupedRequests>): LogsData<GroupedRequests> {
  // API calls related to a wallet with a pending withdrawal cannot be processed
  const withdrawalsBySponsorAddress = keyBy(requests.withdrawals, 'sponsorAddress');
  const initialState: ApiCallsWithLogs = { logs: [], apiCalls: [] };

  const { logs, apiCalls } = requests.apiCalls.reduce((acc, apiCall) => {
    const pendingWithdrawal = withdrawalsBySponsorAddress[apiCall.sponsorAddress];
    if (!pendingWithdrawal) {
      return { ...acc, apiCalls: [...acc.apiCalls, apiCall] };
    }

    const warningLog = logger.pend(
      'WARN',
      `Dropping Request ID:${apiCall.id} as it has a pending Withdrawal ID:${pendingWithdrawal.id}`
    );

    return {
      ...acc,
      logs: [...acc.logs, warningLog],
    };
  }, initialState);

  return [[...prevLogs, ...logs], { ...requests, apiCalls }];
}
