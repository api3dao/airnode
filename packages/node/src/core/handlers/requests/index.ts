import { ProviderRequests, ProviderState } from '../../../types';
import { fetchGroupedLogs } from './event-fetcher';
import * as apiCalls from './api-calls';

export async function fetch(state: ProviderState): Promise<ProviderState> {
  const groupedLogs = await fetchGroupedLogs(state);

  const pendingApiRequests = apiCalls.mapPendingApiRequests(state, groupedLogs.apiCalls);

  // TODO: handle withdrawals

  // TODO: handle wallet authorizations

  const requests: ProviderRequests = {
    apiCalls: pendingApiRequests,
  };

  return { ...state, requests };
}
