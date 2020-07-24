import { ProviderRequests, ProviderState } from '../../../types';
import { promiseTimeout } from '../../utils/promise-utils';
import { fetchGroupedLogs } from './event-fetcher';
import * as apiCalls from './api-calls';

export async function fetch(state: ProviderState): Promise<ProviderRequests> {
  // Let this throw if it fails. We can't do anything if the logs cannot be fetched
  const groupedLogs = await fetchGroupedLogs(state);

  const pendingApiCallsPromise = promiseTimeout(5_000, apiCalls.mapPending(state, groupedLogs.apiCalls))
    .then((res) => ({ id: 'apiCalls', data: res }))
    .catch(() => ({ id: 'apiCalls', data: [] }));

  // TODO: handle withdrawals

  // TODO: handle wallet authorizations

  // Promises are assigned an ID as the order the complete is not guaranteed
  const requestGroups = await Promise.all([pendingApiCallsPromise]);

  const pendingApiCalls = requestGroups.find((r) => r.id === 'apiCalls')!.data;

  return {
    apiCalls: pendingApiCalls,
    walletAuthorizations: [],
    withdrawals: [],
  };
}
