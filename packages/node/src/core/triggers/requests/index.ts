import { goTimeout } from '../../utils/promise-utils';
import { fetchGroupedLogs } from './event-fetcher';
import * as apiCalls from './api-calls';
// import * as walletAuthorizations from './wallet-authorizations';
// import * as withdrawals from './withdrawals';
import * as requesterData from './requester-data';
import * as discarder from './discarder';
import * as validator from './validator';
import { GroupedProviderRequests, ProviderState } from '../../../types';

// Alias types
type InitialGroupedRequests = requesterData.InitialGroupedRequests;

async function fetchRequesterData(state: ProviderState, requests: InitialGroupedRequests) {
  const apiCallAddresses = requests.apiCalls.filter((a) => a.valid).map((a) => a.requesterAddress);
  // const walletAuthorizationAddresses = requests.walletAuthorizations.filter(a => a.valid).map(a => a.requesterAddress);
  // const withdrawalAddresses = requests.withdrawals.filter(a => a.valid).map(a => a.requesterAddress);

  const addresses = [
    ...apiCallAddresses,
    // ...walletAuthorizationAddresses,
    // ...withdrawalAddresses,
  ];

  const [err, res] = await goTimeout(5_000, requesterData.fetch(state, addresses));
  return err || !res ? {} : res;
}

export async function fetchPendingRequests(state: ProviderState): Promise<GroupedProviderRequests> {
  // Let this throw if it fails. We can't do anything if the logs cannot be fetched
  const groupedLogs = await fetchGroupedLogs(state);

  const pendingApiCalls = apiCalls.mapPending(state, groupedLogs.apiCalls);
  // TODO: handle withdrawals and wallet authorizations
  // const pendingWithdrawals = withdrawals.mapPendingWithdrawal(state, groupedLogs.withdrawals);
  // const pendingWalletAuthoriaztions = walletAuthorizations.mapPending(state, groupedLogs.walletAuthorizations);

  const baseRequests = {
    apiCalls: pendingApiCalls,
    walletAuthorizations: [],
    withdrawals: [],
  };

  const dataByAddress = await fetchRequesterData(state, baseRequests);

  // Merge requester data with requests
  const requestsWithData = requesterData.apply(state, baseRequests, dataByAddress);

  // Check that each request is valid
  const validatedRequests = validator.validateRequests(state, requestsWithData);

  const requests = discarder.discardUnprocessableRequests(state, validatedRequests);

  return requests;
}
