import { ProviderRequests, ProviderState } from '../../../types';
import { fetchGroupedLogs } from './event-fetcher';
import * as apiCalls from './api-calls';

export async function fetch(state: ProviderState): Promise<ProviderRequests> {
  // Let this throw if it fails
  const groupedLogs = await fetchGroupedLogs(state);

  const pendingApiRequests = apiCalls.mapPendingRequests(state, groupedLogs.apiCalls);

  // TODO: handle withdrawals

  // TODO: handle wallet authorizations

  return {
    apiCalls: pendingApiRequests,
    walletAuthorizations: [],
    withdrawals: [],
  };
}
