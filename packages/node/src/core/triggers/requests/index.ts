import { ProviderRequests, ProviderState } from '../../../types';
import { goTimeout } from '../../utils/promise-utils';
import { fetchGroupedLogs } from './event-fetcher';
import * as apiCalls from './api-calls';
// import * as walletAuthorizations from './wallet-authorizations';
// import * as withdrawals from './withdrawals';
import * as requesterData from './requester-data';

export async function fetchPendingRequests(state: ProviderState): Promise<ProviderRequests> {
  // Let this throw if it fails. We can't do anything if the logs cannot be fetched
  const groupedLogs = await fetchGroupedLogs(state);

  const pendingApiCalls = apiCalls.mapPending(state, groupedLogs.apiCalls);

  // TODO: handle withdrawals and wallet authorizations
  // const pendingWithdrawals = withdrawals.mapPendingWithdrawal(state, groupedLogs.withdrawals);
  // const pendingWalletAuthoriaztions = walletAuthorizations.mapPending(state, groupedLogs.walletAuthorizations);

  return {
    apiCalls: pendingApiCalls,
    walletAuthorizations: [],
    withdrawals: [],
  };
}

export async function fetchRequesterData(state: ProviderState, requests: ProviderRequests) {
  const addresses = [
    ...apiCalls.mapRequesterAddresses(requests.apiCalls),
    // ...walletAuthorizations.mapAddresses(validWithdrawals),
    // ...withdrawals.mapAddresses(validWithdrawals),
  ];

  const [err, res] = await goTimeout(5_000, requesterData.fetch(state, addresses));
  if (err) {
    return {};
  }
  return res;
}
