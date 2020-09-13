import { go } from '../utils/promise-utils';
import { ProviderConfig, ProviderState } from '../../types';
import * as apiCallAuthorization from '../requests/api-calls/authorization';
import * as logger from '../utils/logger';
import * as triggers from '../ethereum/triggers';
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
  // =================================================================
  // STEP 1: Create a new ProviderState
  // =================================================================
  const state1 = state.create(config, index);

  // =================================================================
  // STEP 2: Get the current block number
  // =================================================================
  const [blockErr, currentBlock] = await go(state1.provider.getBlockNumber());
  if (blockErr || !currentBlock) {
    logger.logProviderError(config.name, 'Unable to get current block', blockErr);
    return null;
  }
  logger.logProviderJSON(config.name, 'INFO', `Current block set to: ${currentBlock}`);
  const state2 = state.update(state1, { currentBlock });

  // =================================================================
  // STEP 3: Get the pending actionable items from triggers
  // =================================================================
  const [dataErr, walletDataByIndex] = await go(triggers.fetchWalletDataByIndex(state2));
  if (dataErr || !walletDataByIndex) {
    logger.logProviderError(config.name, 'Unable to get pending requests and wallet data', dataErr);
    return null;
  }
  const state3 = state.update(state2, { walletDataByIndex });

  // =================================================================
  // STEP 4: Fetch templates, authorization and wallet data
  // =================================================================
  const templatesAndTransactionPromises: ParallelPromise[] = [
    fetchTemplatesAndAuthorizations(state3),
    fetchTransactionCounts(state3),
  ];
  const templatesAndTransactionResults = await Promise.all(templatesAndTransactionPromises);

  // // Each of these promises returns its result with an ID as the
  // // order in which they resolve in not guaranteed.
  const { walletDataWithTemplates, authorizationsByEndpoint } = templatesAndTransactionResults.find(
    (result) => result.id === 'templates+authorizations'
  )!.data;
  const transactionCountsByWalletIndex = templatesAndTransactionResults.find(
    (result) => result.id === 'transaction-counts'
  )!.data;

  const walletDataWithTransactionCounts = templates.mergeTemplatesAndTransactionCounts(
    walletDataWithTemplates,
    transactionCountsByWalletIndex
  );

  const state4 = state.update(state3, { walletDataByIndex: walletDataWithTransactionCounts });

  // // =================================================================
  // // STEP 5: Merge authorizations and transaction counts
  // // =================================================================
  const walletDataWithAuthorizations = apiCallAuthorization.mergeAuthorizations(state4, authorizationsByEndpoint);

  const state5 = state.update(state3, { walletDataByIndex: walletDataWithAuthorizations });

  return state5;
}
