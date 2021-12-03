import flow from 'lodash/flow';
import fromPairs from 'lodash/fromPairs';
import { MAXIMUM_SPONSOR_WALLET_REQUESTS } from '../../constants';
import * as logger from '../../logger';
import { ApiCall, Request, GroupedRequests, LogsData, PendingLog, RequestStatus } from '../../types';

interface ApiCallsWithLogs {
  readonly apiCalls: Request<ApiCall>[];
  readonly logs: PendingLog[];
}

export function blockRequestsWithWithdrawals([
  prevLogs,
  requests,
]: LogsData<GroupedRequests>): LogsData<GroupedRequests> {
  const pendingApiCalls = requests.apiCalls.filter((r) => r.status === RequestStatus.Pending);
  // API calls related to a wallet with a pending withdrawal cannot be processed
  const pendingWithdrawals = requests.withdrawals.filter((r) => r.status === RequestStatus.Pending);

  const withdrawalsBySponsorAddress = fromPairs(pendingWithdrawals.map((w) => [w.sponsorAddress, w]));

  const initialState: ApiCallsWithLogs = { logs: [], apiCalls: [] };

  const { logs, apiCalls } = pendingApiCalls.reduce((acc, apiCall) => {
    const pendingWithdrawal = withdrawalsBySponsorAddress[apiCall.sponsorAddress];

    if (pendingWithdrawal) {
      const warningLog = logger.pend(
        'WARN',
        `Ignoring Request ID:${apiCall.id} as it has a pending Withdrawal ID:${pendingWithdrawal.id}`
      );
      return {
        ...acc,
        logs: [...acc.logs, warningLog],
      };
    }

    return { ...acc, apiCalls: [...acc.apiCalls, apiCall] };
  }, initialState);

  return [[...prevLogs, ...logs], { ...requests, apiCalls }];
}

export function applySponsorRequestLimit([prevLogs, requests]: LogsData<GroupedRequests>): LogsData<GroupedRequests> {
  const requestCountPerSponsor = new Map<string, number>();
  const allowedApiCalls: Request<ApiCall>[] = [];
  const logs: PendingLog[] = [];
  requests.apiCalls.forEach((apiCall) => {
    if (!requestCountPerSponsor.has(apiCall.sponsorAddress)) {
      requestCountPerSponsor.set(apiCall.sponsorAddress, 0);
    }
    const sponsorRequests = requestCountPerSponsor.get(apiCall.sponsorAddress)!;

    if (sponsorRequests < MAXIMUM_SPONSOR_WALLET_REQUESTS) {
      requestCountPerSponsor.set(apiCall.sponsorAddress, sponsorRequests + 1);
      allowedApiCalls.push(apiCall);
    } else {
      logs.push(logger.pend('WARN', `Ignoring Request ID:${apiCall.id} as it exceeded sponsor wallet request limit.`));
    }
  });

  return [[...prevLogs, ...logs], { ...requests, apiCalls: allowedApiCalls }];
}

// TODO: Merge with verification/api-call-verification.ts
export const blockRequests = (requests: GroupedRequests): LogsData<GroupedRequests> => {
  const filterRequests = flow(blockRequestsWithWithdrawals, applySponsorRequestLimit);
  return filterRequests([[], requests]);
};
