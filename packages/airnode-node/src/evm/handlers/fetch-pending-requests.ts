import { logger } from '@api3/airnode-utilities';
import * as apiCalls from '../requests/api-calls';
import * as blocking from '../requests/blocking';
import * as eventLogs from '../requests/event-logs';
import * as withdrawals from '../requests/withdrawals';
import { EVMProviderState, GroupedRequests, ProviderState } from '../../types';
import { FetchOptions } from '../requests/event-logs';

export async function fetchPendingRequests(state: ProviderState<EVMProviderState>): Promise<GroupedRequests> {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId } = state;

  const baseLogOptions = {
    format: state.settings.logFormat,
    level: state.settings.logLevel,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  const fetchOptions: FetchOptions = {
    address: state.contracts.AirnodeRrp,
    airnodeAddress: state.settings.airnodeAddress,
    blockHistoryLimit: state.settings.blockHistoryLimit,
    currentBlock: state.currentBlock!,
    ignoreBlockedRequestsAfterBlocks: state.settings.ignoreBlockedRequestsAfterBlocks,
    minConfirmations: state.settings.minConfirmations,
    provider: state.provider,
  };
  // Fetch event logs from the provider. Let this throw if something goes wrong.
  // We can't do anything if logs cannot be fetched or parsed successfully.
  const flatLogs = await eventLogs.fetch(fetchOptions);
  const groupedLogs = eventLogs.group(flatLogs);

  // Cast the raw logs into the various typed request models
  const [apiLogs, apiCallRequests] = apiCalls.mapRequests(groupedLogs.apiCalls);
  logger.logPending(apiLogs, baseLogOptions);

  const [withdrawLogs, withdrawalRequests] = withdrawals.mapRequests(groupedLogs.withdrawals);
  logger.logPending(withdrawLogs, baseLogOptions);

  const groupedRequests: GroupedRequests = {
    apiCalls: apiCallRequests,
    withdrawals: withdrawalRequests,
  };

  // Block (filter out) any requests that cannot be processed
  // TODO: Better naming
  const [blockRequestsLogs, allowedRequests] = blocking.blockRequests(groupedRequests);
  logger.logPending(blockRequestsLogs, baseLogOptions);

  return allowedRequests;
}
