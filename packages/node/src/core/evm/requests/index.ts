import { goTimeout } from '../../utils/promise-utils';
import * as apiCalls from './api-calls';
import * as blocking from './blocking';
import * as eventLogs from './event-logs';
import * as logger from '../../logger';
import * as requesterData from './requester-data';
import * as validation from './validation';
import * as walletDesignations from './wallet-designations';
import * as withdrawals from './withdrawals';
import { EVMProviderState, GroupedBaseRequests, GroupedRequests, ProviderState } from '../../../types';

export { groupRequestsByWalletIndex } from './grouping';

export async function fetchPendingRequests(state: ProviderState<EVMProviderState>): Promise<GroupedRequests> {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId } = state;

  const baseLogOptions = {
    format: state.settings.logFormat,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  // =================================================================
  // STEP 1: Fetch all requests and group them
  // =================================================================
  const fetchOptions = {
    address: state.contracts.Airnode,
    currentBlock: state.currentBlock!,
    provider: state.provider,
  };
  // Fetch event logs from the provider. Let this throw if something goes wrong.
  // We can't do anything if logs cannot be fetched or parsed successfully.
  const flatLogs = await eventLogs.fetch(fetchOptions);
  const groupedLogs = eventLogs.group(flatLogs);

  // Cast the raw logs into the various typed request models
  const metadata = { providerIndex: state.index };
  const [baseApiLogs, baseApiCalls] = apiCalls.mapBaseRequests(groupedLogs.apiCalls, metadata);
  logger.logPending(baseApiLogs, baseLogOptions);

  const [baseDesigLogs, baseDesignations] = walletDesignations.mapBaseRequests(
    groupedLogs.walletDesignations,
    metadata
  );
  logger.logPending(baseDesigLogs, baseLogOptions);

  const [baseWithdrawLogs, baseWithdrawals] = withdrawals.mapBaseRequests(groupedLogs.withdrawals, metadata);
  logger.logPending(baseWithdrawLogs, baseLogOptions);

  const baseRequests: GroupedBaseRequests = {
    apiCalls: baseApiCalls,
    walletDesignations: baseDesignations,
    withdrawals: baseWithdrawals,
  };

  // =================================================================
  // STEP 2: Fetch and merge requester data
  // =================================================================
  const fetchReqDataOptions = {
    address: state.contracts.Convenience,
    provider: state.provider,
  };
  // Fetch requester data (requesterId, wallet details etc) for each request type
  const fetchRequesterData = requesterData.fetch(fetchReqDataOptions, baseRequests);
  const [_fetchReqDataErr, fetchedReqDataWithLogs] = await goTimeout(5000, fetchRequesterData);
  if (fetchedReqDataWithLogs && fetchedReqDataWithLogs[0]) {
    logger.logPending(fetchedReqDataWithLogs[0], baseLogOptions);
  }

  // Merge requester data with requests
  const reqDataByAddress = fetchedReqDataWithLogs && fetchedReqDataWithLogs[2] ? fetchedReqDataWithLogs[2] : {};
  const [requestsWithDataLogs, _requestsWithDataErr, requestsWithData] = requesterData.apply(
    baseRequests,
    reqDataByAddress
  );
  logger.logPending(requestsWithDataLogs, baseLogOptions);

  // =================================================================
  // STEP 3: Perform additional validations and checks
  // =================================================================
  // Check that each request is valid
  const [validationLogs, validatedRequests] = validation.validateRequests(requestsWithData);
  logger.logPending(validationLogs, baseLogOptions);

  // Block any requests that cannot be processed
  // 1. API calls related to a wallet with a pending withdrawal cannot be processed
  const [blockedLogs, blockedRequests] = blocking.blockRequestsWithWithdrawals(validatedRequests);
  logger.logPending(blockedLogs, baseLogOptions);

  return blockedRequests;
}
