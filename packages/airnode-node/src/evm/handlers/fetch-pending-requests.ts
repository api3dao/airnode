import { logger } from '@api3/airnode-utilities';
import * as apiCalls from '../requests/api-calls';
import * as blocking from '../requests/blocking';
import * as eventLogs from '../requests/event-logs';
import * as withdrawals from '../requests/withdrawals';
import { EVMProviderState, GroupedRequests, ProviderState } from '../../types';
import { FetchOptions } from '../requests/event-logs';

export async function fetchPendingRequests(state: ProviderState<EVMProviderState>): Promise<GroupedRequests> {
  const { chainId } = state.settings;

  const fetchOptions: FetchOptions = {
    address: state.contracts.AirnodeRrp,
    airnodeAddress: state.settings.airnodeAddress,
    blockHistoryLimit: state.settings.blockHistoryLimit,
    currentBlock: state.currentBlock!,
    minConfirmations: state.settings.minConfirmations,
    mayOverrideMinConfirmations: state.settings.mayOverrideMinConfirmations,
    provider: state.provider,
    chainId,
  };
  // Fetch event logs from the provider. Let this throw if something goes wrong.
  // We can't do anything if logs cannot be fetched or parsed successfully.
  const flatLogs = await eventLogs.fetch(fetchOptions);
  const groupedLogs = eventLogs.group(flatLogs);

  // Cast the raw logs into the various typed request models
  const [apiLogs, apiCallRequests] = apiCalls.mapRequests(groupedLogs.apiCalls);
  logger.logPending(apiLogs);

  const [withdrawLogs, withdrawalRequests] = withdrawals.mapRequests(groupedLogs.withdrawals);
  logger.logPending(withdrawLogs);

  const groupedRequests: GroupedRequests = {
    apiCalls: apiCallRequests,
    withdrawals: withdrawalRequests,
  };

  const [blockRequestsLogs, allowedRequests] = blocking.blockRequestsWithWithdrawals([[], groupedRequests]);
  logger.logPending(blockRequestsLogs);

  return allowedRequests;
}
