import flow from 'lodash/flow';
import keyBy from 'lodash/keyBy';
import { logger, PendingLog } from '@api3/airnode-utilities';
import { MAXIMUM_SPONSOR_WALLET_REQUESTS } from '../../constants';
import { ApiCall, Request, GroupedRequests, LogsData, RequestStatus, RequestErrorMessage } from '../../types';

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

/**
 * We need to limit the requests from the same sponsor because they are performed in parallel. However, we cannot just
 * filter based on sponsor or sponsor wallet only, because we have not yet validated which is the correct sponsor wallet
 * for a given sponsor.
 *
 * Instead we need to limit the request based on (sponsor, sponsor wallet) pair.
 */
export function applySponsorAndSponsorWalletRequestLimit([
  prevLogs,
  requests,
]: LogsData<GroupedRequests>): LogsData<GroupedRequests> {
  const requestCountPerSponsorId = new Map<string, number>();
  const allowedApiCalls: Request<ApiCall>[] = [];
  const logs: PendingLog[] = [];

  requests.apiCalls.forEach((apiCall) => {
    if (apiCall.status !== RequestStatus.Pending) return;
    // The "sponsor id" is a unique combination of sponsor and sponsor wallet
    const sponsorId = `${apiCall.sponsorAddress}-${apiCall.sponsorWalletAddress}`;

    if (!requestCountPerSponsorId.has(sponsorId)) {
      requestCountPerSponsorId.set(sponsorId, 0);
    }
    const sponsorRequests = requestCountPerSponsorId.get(sponsorId)!;

    if (sponsorRequests < MAXIMUM_SPONSOR_WALLET_REQUESTS) {
      requestCountPerSponsorId.set(sponsorId, sponsorRequests + 1);
      allowedApiCalls.push(apiCall);
      return;
    }

    logs.push(logger.pend('WARN', `Blocking Request ID:${apiCall.id} as it exceeded sponsor request limit.`));
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
  const filterRequests = flow(blockRequestsWithWithdrawals, applySponsorAndSponsorWalletRequestLimit);
  return filterRequests([[], requests]);
};
