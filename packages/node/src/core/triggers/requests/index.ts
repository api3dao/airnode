import { ProviderRequests, ProviderState } from '../../../types';
import { fetchGroupedLogs } from './event-fetcher';
import * as apiCalls from './api-calls';

export async function fetch(state: ProviderState): Promise<ProviderRequests> {
  const groupedLogs = await fetchGroupedLogs(state);
  // If we failed to fetch any logs, then there is nothing to action now. Logs
  // will be fethed on the next run.
  if (!groupedLogs) {
    return {
      apiCalls: [],
      walletAuthorizations: [],
      withdrawals: [],
    };
  }

  const pendingApiRequests = apiCalls.mapPendingRequests(state, groupedLogs.apiCalls);

  // TODO: handle withdrawals

  // TODO: handle wallet authorizations

  return {
    apiCalls: pendingApiRequests,
    walletAuthorizations: [],
    withdrawals: [],
  };
}
