import { go } from '../../utils/promise-utils';
import * as authorization from '../authorization';
import * as logger from '../../logger';
import * as triggers from '../triggers';
import * as templates from '../templates';
import * as transactionCounts from '../transaction-counts';
import * as providerSettings from '../../config/provider-settings';
import * as state from '../../providers/state';
import { ChainConfig, EVMProviderState, ProviderState } from '../../../types';

type ParallelPromise = Promise<{ id: string; data: any }>;

async function fetchTemplatesAndAuthorizations(currentState: ProviderState<EVMProviderState>) {
  // This should not throw
  const res = await templates.fetchTemplatesAndAuthorizations(currentState);
  return { id: 'templates+authorizations', data: res };
}

async function fetchTransactionCounts(currentState: ProviderState<EVMProviderState>) {
  // This should not throw
  const res = await transactionCounts.getTransactionCountByIndex(currentState);
  return { id: 'transaction-counts', data: res };
}

export async function initializeState(coordinatorId: string, config: ChainConfig, index: number): Promise<ProviderState<EVMProviderState> | null> {
  // =================================================================
  // STEP 1: Create a new ProviderState
  // =================================================================
  const chainProvider = config.providers[index];
  // Settings should typically be the same between runs, while state should be different
  const settings = providerSettings.create(config, chainProvider);
  const state1 = state.create(coordinatorId, config, settings)!;
  const { name: providerName } = state1.settings;

  // =================================================================
  // STEP 2: Get the current block number
  // =================================================================
  const [blockErr, currentBlock] = await go(state1.provider.getBlockNumber());
  if (blockErr || !currentBlock) {
    logger.error('Unable to get current block', { coordinatorId, providerName, error: blockErr });
    return null;
  }
  logger.info(`Current block set to: ${currentBlock}`, { coordinatorId, providerName });
  const state2 = state.update(state1, { currentBlock });

  // =================================================================
  // STEP 3: Get the pending actionable items from triggers
  // =================================================================
  const [dataErr, walletDataByIndex] = await go(triggers.fetchWalletDataByIndex(state2));
  if (dataErr || !walletDataByIndex) {
    logger.error('Unable to get pending requests and wallet data', { coordinatorId, providerName, error: dataErr });
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

  // // =================================================================
  // // STEP 5: Merge authorizations and transaction counts
  // // =================================================================
  const [authLogs, _authErr, walletDataWithAuthorizations] = authorization.mergeAuthorizations(
    walletDataWithTransactionCounts,
    authorizationsByEndpoint
  );
  logger.logPending(authLogs, { coordinatorId, providerName });

  const state5 = state.update(state3, { walletDataByIndex: walletDataWithAuthorizations });

  return state5;
}
