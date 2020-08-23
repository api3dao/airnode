import { goTimeout } from '../../utils/promise-utils';
import { fetchGroupedLogs } from './event-fetcher';
import * as apiCalls from './api-calls';
import * as blocking from './blocking';
import * as requesterData from './requester-data';
import * as validator from './validator';
import * as walletDesignations from './wallet-designations';
import * as withdrawals from './withdrawals';
import { GroupedRequests, ProviderState } from '../../../types';

export { groupRequestsByWalletIndex } from './grouping';

// Alias types
type GroupedBaseRequests = requesterData.GroupedBaseRequests;

async function fetchRequesterData(state: ProviderState, requests: GroupedBaseRequests) {
  // NOTE: WalletDesignations do not need to fetch Requester Data
  const apiCallAddresses = requests.apiCalls.map((a) => a.requesterAddress);
  const withdrawalAddresses = requests.withdrawals.map((w) => w.destinationAddress);

  const addresses = [...apiCallAddresses, ...withdrawalAddresses];

  const [err, res] = await goTimeout(5_000, requesterData.fetch(state, addresses));
  return err || !res ? {} : res;
}

export async function fetchPendingRequests(state: ProviderState): Promise<GroupedRequests> {
  // Let this throw if it fails. We can't do anything if the logs cannot be fetched
  const groupedLogs = await fetchGroupedLogs(state);

  const pendingApiCalls = apiCalls.mapBaseRequests(state, groupedLogs.apiCalls);
  const pendingWalletDesignations = walletDesignations.mapBaseRequests(state, groupedLogs.walletDesignations);
  const pendingWithdrawals = withdrawals.mapBaseRequests(state, groupedLogs.withdrawals);

  const baseRequests: GroupedBaseRequests = {
    apiCalls: pendingApiCalls,
    walletDesignations: pendingWalletDesignations,
    withdrawals: pendingWithdrawals,
  };

  const dataByAddress = await fetchRequesterData(state, baseRequests);

  // Merge requester data with requests
  const requestsWithData = requesterData.apply(state, baseRequests, dataByAddress);

  // Check that each request is valid
  const validatedRequests = validator.validateRequests(state, requestsWithData);

  // Block any requests that cannot be processed
  // 1. API calls related to a wallet with a pending withdrawal cannot be processed
  const blockedRequestsWithWithdrawals = blocking.blockRequestsWithWithdrawals(state, validatedRequests);

  return blockedRequestsWithWithdrawals;
}
