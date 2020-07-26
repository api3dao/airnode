import { ethers } from 'ethers';
import { ProviderRequests, ProviderState } from '../../../types';
import { goTimeout } from '../../utils/promise-utils';
import { fetchGroupedLogs } from './event-fetcher';
import * as apiCalls from './api-calls/entry';
// import * as walletAuthorizations from './wallet-authorizations';
// import * as withdrawals from './withdrawals';

const TIMEOUT = 5000;

async function mapPendingApiCalls(state: ProviderState, logs: ethers.utils.LogDescription[]) {
  const [err, res] = await goTimeout(TIMEOUT, apiCalls.mapPending(state, logs));
  if (err || !res) {
    return { id: 'api-calls', data: [] };
  }
  return { id: 'api-calls', data: res };
}

// async function mapPendingWithdrawals(state, logs: ethers.utils.LogDescription[]) {
//   const [err, res] = await goTimeout(TIMEOUT, withdrawals.mapPending(state, logs));
//   if (err || !res) {
//     return { id: 'withdrawals', data: [] };
//   }
//   return { id: 'withdrawals', data: res };
// }
//
// async function mapPendingWalletAuthorizations(state, logs: ethers.utils.LogDescription[]) {
//   const [err, res] = await goTimeout(TIMEOUT, walletAuthorizations.mapPending(state, logs));
//   if (err || !res) {
//     return { id: 'wallet-authorizations', data: [] };
//   }
//   return { id: 'wallet-authorizations', data: res };
// }

export async function fetch(state: ProviderState): Promise<ProviderRequests> {
  // Let this throw if it fails. We can't do anything if the logs cannot be fetched
  const groupedLogs = await fetchGroupedLogs(state);

  const pendingApiCallsPromise = mapPendingApiCalls(state, groupedLogs.apiCalls);

  // TODO: handle withdrawals and wallet authorizations
  // const pendingWithdrawalsPromise = mapPendingWithdrawal(state, groupedLogs.withdrawals);
  // const pendingWalletAuthoriaztionsPromise = mapPendingWalletAuthorizations(state, groupedLogs.walletAuthorizations);

  // Promises are assigned an ID as the order the complete is not guaranteed
  const requestGroups = await Promise.all([pendingApiCallsPromise]);

  const pendingApiCalls = requestGroups.find((r) => r.id === 'api-calls')!.data;

  return {
    apiCalls: pendingApiCalls,
    walletAuthorizations: [],
    withdrawals: [],
  };
}
