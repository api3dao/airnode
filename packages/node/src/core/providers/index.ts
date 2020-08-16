import { go } from '../utils/promise-utils';
import { ProviderConfig, ProviderState } from '../../types';
import * as apiCallAuthorization from '../requests/api-calls/authorization';
import * as logger from '../utils/logger';
import * as requestTriggers from '../triggers/requests';
import * as templates from '../templates';
import * as transactionCounts from '../ethereum/transaction-counts';
import * as state from './state';

type ParallelPromise = Promise<{ id: string; data: any }>;

async function fetchTemplatesAndAuthorizations(currentState: ProviderState) {
  // This should not throw
  const res = await templates.fetchTemplatesAndAuthorizations(currentState);
  return { id: 'templates+authorizations', data: res };
}

async function fetchTransactionCounts(currentState: ProviderState) {
  // This should not throw
  const res = await transactionCounts.getTransactionCountByIndex(currentState);
  return { id: 'transaction-counts', data: res };
}

export async function initializeState(config: ProviderConfig, index: number): Promise<ProviderState | null> {
  const state1 = state.create(config, index);

  // =================================================================
  // STEP 1: Get the current block number
  // =================================================================
  const [blockErr, currentBlock] = await go(state1.provider.getBlockNumber());
  if (blockErr || !currentBlock) {
    logger.logProviderError(config.name, 'Unable to get current block', blockErr);
    return null;
  }
  logger.logProviderJSON(config.name, 'INFO', `Current block set to: ${currentBlock}`);
  const state2 = state.update(state1, { currentBlock });

  // =================================================================
  // STEP 2: Get the pending requests
  //
  // TODO: aggregator requests will be fetched in
  // parallel with this at a later point
  // =================================================================
  const [requestsErr, requests] = await go(requestTriggers.fetchPendingRequests(state2));
  if (requestsErr || !requests) {
    logger.logProviderError(config.name, 'Unable to get pending requests', requestsErr);
    return null;
  }
  const pendingRequestsMsg = `Pending requests: ${requests.apiCalls.length} API calls, ${requests.withdrawals.length} withdrawals, ${requests.walletDesignations.length} wallet designations`;
  logger.logProviderJSON(config.name, 'DEBUG', pendingRequestsMsg);
  const state3 = state.update(state2, { requests });

  // =================================================================
  // STEP 3: Fetch templates, authorization and wallet data
  // =================================================================
  const templatesAndTransactionPromises: ParallelPromise[] = [
    fetchTemplatesAndAuthorizations(state3),
    fetchTransactionCounts(state3),
  ];
  const templatesAndTransactionResults = await Promise.all(templatesAndTransactionPromises);

  // Each of these promises returns its result with an ID as the
  // order in which they resolve in not guaranteed.
  const { apiCallsWithTemplates, authorizationsByEndpoint } = templatesAndTransactionResults.find(
    (result) => result.id === 'templates+authorizations'
  )!.data;
  const transactionCountsByWalletIndex = templatesAndTransactionResults.find(
    (result) => result.id === 'transaction-counts'
  )!.data;

  // API calls with templates is now the source of truth
  const state4 = state.update(state3, { requests: { ...state3.requests, apiCalls: apiCallsWithTemplates } });

  // =================================================================
  // STEP 4: Merge authorizations and transaction counts
  // =================================================================
  const authorizedApiCalls = apiCallAuthorization.mergeAuthorizations(state4, authorizationsByEndpoint);

  const state5 = state.update(state4, {
    requests: { ...state4.requests, apiCalls: authorizedApiCalls },
    transactionCountsByWalletIndex,
  });

  return state5;
}
