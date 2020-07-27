import { ethers } from 'ethers';
import { ProviderRequests, ProviderState } from '../../../types';
import { goTimeout } from '../../utils/promise-utils';
import { fetchGroupedLogs } from './event-fetcher';
import * as apiCalls from './api-calls';
// import * as walletAuthorizations from './wallet-authorizations';
import * as withdrawals from './withdrawals';

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

  const pendingApiCalls = apiCalls.mapPending(state, groupedLogs.apiCalls);
  const pendingWithdrawals = withdrawals.mapPending(state, groupedLogs.withdrawals);

  // TODO: handle wallet authorizations
  // const pendingWalletAuthoriaztionsPromise = mapPendingWalletAuthorizations(state, groupedLogs.walletAuthorizations);

  return {
    apiCalls: pendingApiCalls,
    walletAuthorizations: [],
    withdrawals: pendingWithdrawals,
  };
}
