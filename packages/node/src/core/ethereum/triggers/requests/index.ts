import { goTimeout } from '../../../utils/promise-utils';
import * as apiCalls from './api-calls';
import * as contracts from '../../contracts';
import * as blocking from './blocking';
import * as eventLogs from './event-logs';
import * as logger from '../../../utils/logger';
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
  // Fetch event logs from the provider. Let this throw if something goes wrong.
  // We can't do anything if logs cannot be fetched or parsed successfully.
  const flatLogs = await eventLogs.fetch(fetchOptions);
  const groupedLogs = eventLogs.group(flatLogs);

  // Cast the logs into the various typed request models
  const [baseApiLogs, _baseApiErr, baseApiCalls] = apiCalls.mapBaseRequests(groupedLogs.apiCalls);
  const [baseDesigLogs, _baseDesigErr, baseDesignations] = walletDesignations.mapBaseRequests(
    groupedLogs.walletDesignations
  );
  const [baseWithdrawLogs, _baseWithdrawErr, baseWithdrawals] = withdrawals.mapBaseRequests(groupedLogs.withdrawals);
  logger.logPendingMessages(state.config.name, [...baseApiLogs, ...baseDesigLogs, ...baseWithdrawLogs]);

  const baseRequests: GroupedBaseRequests = {
    apiCalls: baseApiCalls,
    walletDesignations: baseDesignations,
    withdrawals: baseWithdrawals,
  };

  const fetchReqDataOptions = {
    address: contracts.Convenience.addresses[state.config.chainId],
    provider: state.provider,
  };
  // Fetch requester data (requesterId, wallet details etc) for each request type
  const fetchRequesterData = requesterData.fetch(fetchReqDataOptions, baseRequests);
  const [_fetchReqDataErr, fetchedReqDataWithLogs] = await goTimeout(5000, fetchRequesterData);
  if (fetchedReqDataWithLogs) {
    logger.logPendingMessages(state.config.name, fetchedReqDataWithLogs[0]);
  }

  // Merge requester data with requests
  const reqDataByAddress = fetchedReqDataWithLogs && fetchedReqDataWithLogs[1] ? fetchedReqDataWithLogs[1] : {};
  const [requestsWithDataLogs, _requestsWithDataErr, requestsWithData] = requesterData.apply(
    baseRequests,
    reqDataByAddress
  );
  logger.logPendingMessages(state.config.name, requestsWithDataLogs);

  // Check that each request is valid
  const [validationLogs, _validationErr, validatedRequests] = validation.validateRequests(requestsWithData);
  logger.logPendingMessages(state.config.name, validationLogs);

  // Block any requests that cannot be processed
  // 1. API calls related to a wallet with a pending withdrawal cannot be processed
  const [blockedLogs, _blockedErr, blockedRequests] = blocking.blockRequestsWithWithdrawals(validatedRequests);
  logger.logPendingMessages(state.config.name, blockedLogs);

  return blockedRequests;
}
