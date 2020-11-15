import * as apiCalls from './api-calls';
import * as blocking from './blocking';
import * as eventLogs from './event-logs';
import * as logger from '../../logger';
import * as verification from '../verification';
import * as withdrawals from './withdrawals';
import { EVMProviderState, GroupedRequests, ProviderState } from '../../../types';

export async function fetchPendingRequests(state: ProviderState<EVMProviderState>): Promise<GroupedRequests> {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId } = state;

  const baseLogOptions = {
    format: state.settings.logFormat,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  const fetchOptions = {
    address: state.contracts.Airnode,
    blockHistoryLimit: state.settings.blockHistoryLimit,
    currentBlock: state.currentBlock!,
    provider: state.provider,
    providerId: state.settings.providerId,
  };
  // Fetch event logs from the provider. Let this throw if something goes wrong.
  // We can't do anything if logs cannot be fetched or parsed successfully.
  const flatLogs = await eventLogs.fetch(fetchOptions);
  const groupedLogs = eventLogs.group(flatLogs);

  // Cast the raw logs into the various typed request models
  const [apiLogs, apiCallRequests] = apiCalls.mapRequests(groupedLogs.apiCalls);
  logger.logPending(apiLogs, baseLogOptions);

  const [verifyLogs, verifiedApiCalls] = verification.verifyApiCallIds(apiCallRequests);
  logger.logPending(verifyLogs, baseLogOptions);

  const [withdrawLogs, withdrawalRequests] = withdrawals.mapRequests(groupedLogs.withdrawals);
  logger.logPending(withdrawLogs, baseLogOptions);

  const groupedRequests: GroupedRequests = {
    apiCalls: verifiedApiCalls,
    withdrawals: withdrawalRequests,
  };

  // Block any requests that cannot be processed
  // 1. API calls related to a wallet with a pending withdrawal cannot be processed
  const [blockedLogs, blockedRequests] = blocking.blockRequestsWithWithdrawals(groupedRequests);
  logger.logPending(blockedLogs, baseLogOptions);

  return blockedRequests;
}
