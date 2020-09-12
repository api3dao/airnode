import { goTimeout } from '../../../utils/promise-utils';
import * as apiCalls from './api-calls';
import * as contracts from '../../contracts';
import * as blocking from './blocking';
import * as logger from '../../../utils/logger';
import * as logs from './logs';
import * as requesterData from './requester-data';
import * as validation from './validation';
import * as walletDesignations from './wallet-designations';
import * as withdrawals from './withdrawals';
import { GroupedBaseRequests, GroupedRequests, ProviderState } from '../../../../types';
export { groupRequestsByWalletIndex } from './grouping';

export async function fetchPendingRequests(state: ProviderState): Promise<GroupedRequests> {
  const fetchOptions = {
    address: contracts.Airnode.addresses[state.config.chainId],
    currentBlock: state.currentBlock!,
    provider: state.provider,
  };
  const [fetchLogsLogs, fetchLogsErr, fetchLogsData] = await logs.fetch(fetchOptions);
  logger.logPendingMessages(state.config.name, fetchLogsLogs);

  const pendingApiCalls = apiCalls.mapBaseRequests(state, groupedLogs.apiCalls);
  const pendingWalletDesignations = walletDesignations.mapBaseRequests(state, groupedLogs.walletDesignations);
  const pendingWithdrawals = withdrawals.mapBaseRequests(state, groupedLogs.withdrawals);

  const baseRequests: GroupedBaseRequests = {
    apiCalls: pendingApiCalls,
    walletDesignations: pendingWalletDesignations,
    withdrawals: pendingWithdrawals,
  };

  const fetchRequesterDataOptions = {
    address: contracts.Convenience.addresses[state.config.chainId],
    provider: state.provider,
  };
  const fetchRequesterData = requesterData.fetch(fetchRequesterDataOptions, baseRequests);
  const [requesterDataLogs, requesterDataErr, requesterData] = await goTimeout(5000, fetchRequesterData);

  // Merge requester data with requests
  const requestsWithData = requesterData.apply(state, baseRequests, dataByAddress);

  // Check that each request is valid
  const [validationLogs, _validationErr, validatedRequests] = validation.validateRequests(requestsWithData);
  logger.logPendingMessages(state.config.name, validationLogs);

  // Block any requests that cannot be processed
  // 1. API calls related to a wallet with a pending withdrawal cannot be processed
  const [blockedLogs, _blockedErr, blockedRequests] = blocking.blockRequestsWithWithdrawals(validatedRequests);
  logger.logPendingMessages(state.config.name, blockedLogs);

  return blockedRequests;
}
