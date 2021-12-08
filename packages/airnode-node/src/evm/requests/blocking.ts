import flow from 'lodash/flow';
import keyBy from 'lodash/keyBy';
import { MAXIMUM_SPONSOR_WALLET_REQUESTS } from '../../constants';
import * as logger from '../../logger';
import {
  ApiCall,
  Request,
  GroupedRequests,
  LogsData,
  PendingLog,
  RequestStatus,
  RequestErrorMessage,
} from '../../types';

interface ApiCallsWithLogs {
  readonly apiCalls: Request<ApiCall>[];
  readonly logs: PendingLog[];
}

export function blockRequestsWithWithdrawals([
  prevLogs,
  requests,
]: LogsData<GroupedRequests>): LogsData<GroupedRequests> {
  // API calls related to a wallet with a pending withdrawal cannot be processed
  const pendingWithdrawals = requests.withdrawals.filter((r) => r.status === RequestStatus.Pending);
  const withdrawalsBySponsorAddress = keyBy(pendingWithdrawals, 'sponsorAddress');
  const initialState: ApiCallsWithLogs = { logs: [], apiCalls: [] };

  const { logs, apiCalls } = requests.apiCalls.reduce((acc, apiCall) => {
    const pendingWithdrawal = withdrawalsBySponsorAddress[apiCall.sponsorAddress];
    if (apiCall.status !== RequestStatus.Pending || !pendingWithdrawal) {
      return { ...acc, apiCalls: [...acc.apiCalls, apiCall] };
    }

    const warningLog = logger.pend(
      'WARN',
      `Ignoring Request ID:${apiCall.id} as it has a pending Withdrawal ID:${pendingWithdrawal.id}`
    );
    const blockedCall: Request<ApiCall> = {
      ...apiCall,
      status: RequestStatus.Ignored,
      // TODO: These error messages should be functions accepting id parameter and creating the error string
      errorMessage: `${RequestErrorMessage.PendingWithdrawal}: ${pendingWithdrawal.id}`,
    };

    return {
      ...acc,
      logs: [...acc.logs, warningLog],
      apiCalls: [...acc.apiCalls, blockedCall],
    };
  }, initialState);

  return [[...prevLogs, ...logs], { ...requests, apiCalls }];
}

export function applySponsorRequestLimit([prevLogs, requests]: LogsData<GroupedRequests>): LogsData<GroupedRequests> {
  const requestCountPerSponsor = new Map<string, number>();
  const allowedApiCalls: Request<ApiCall>[] = [];
  const logs: PendingLog[] = [];

  // TODO: Consider reduce or map for as functional approach
  requests.apiCalls.forEach((apiCall) => {
    if (apiCall.status !== RequestStatus.Pending) return;

    if (!requestCountPerSponsor.has(apiCall.sponsorAddress)) {
      requestCountPerSponsor.set(apiCall.sponsorAddress, 0);
    }
    const sponsorRequests = requestCountPerSponsor.get(apiCall.sponsorAddress)!;

    if (sponsorRequests < MAXIMUM_SPONSOR_WALLET_REQUESTS) {
      requestCountPerSponsor.set(apiCall.sponsorAddress, sponsorRequests + 1);
      allowedApiCalls.push(apiCall);
      return;
    }

    logs.push(logger.pend('WARN', `Blocking Request ID:${apiCall.id} as it exceeded sponsor wallet request limit.`));
    const blockedCall: Request<ApiCall> = {
      ...apiCall,
      status: RequestStatus.Blocked,
      errorMessage: `${RequestErrorMessage.SponsorRequestLimitExceeded}: ${apiCall.id}`,
    };
    allowedApiCalls.push(blockedCall);
  });

  return [[...prevLogs, ...logs], { ...requests, apiCalls: allowedApiCalls }];
}

// TODO: Merge with verification/api-call-verification.ts
export const blockRequests = (requests: GroupedRequests): LogsData<GroupedRequests> => {
  const filterRequests = flow(blockRequestsWithWithdrawals, applySponsorRequestLimit);
  return filterRequests([[], requests]);
};
