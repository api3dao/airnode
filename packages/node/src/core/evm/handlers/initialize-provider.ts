import { go } from '../../utils/promise-utils';
import * as apiCalls from '../../requests/api-calls';
import * as authorization from '../authorization';
import * as grouping from '../requests/grouping';
import * as logger from '../../logger';
import { newProvider } from '../retry-provider';
import * as providers from '../providers';
import * as state from '../../providers/state';
import * as triggers from '../triggers';
import * as templates from '../templates';
import * as transactionCounts from '../transaction-counts';
import * as verification from '../verification';
import * as wallet from '../wallet';
import { EVMProviderState, PendingLog, ProviderState } from '../../../types';

type ParallelPromise = Promise<{ id: string; data: any; logs?: PendingLog[] }>;

async function fetchTemplatesAndAuthorizations(currentState: ProviderState<EVMProviderState>) {
  // This should not throw
  const res = await templates.fetchTemplatesAndAuthorizations(currentState);
  return { id: 'templates+authorizations', data: res };
}

async function fetchTransactionCounts(currentState: ProviderState<EVMProviderState>) {
  const xpub = wallet.getExtendedPublicKey();
  const indices = Object.keys(currentState.walletDataByIndex);
  const addresses = indices.map((index) => wallet.deriveWalletAddressFromIndex(xpub, index));
  const fetchOptions = { currentBlock: currentState.currentBlock!, provider: currentState.provider };
  // This should not throw
  const [logs, res] = await transactionCounts.fetchByAddress(addresses, fetchOptions);
  return { id: 'transaction-counts', data: res, logs };
}

export async function initializeProvider(
  initialState: ProviderState<EVMProviderState>
): Promise<ProviderState<EVMProviderState> | null> {
  const { coordinatorId } = initialState;
  const { chainId, chainType, name: providerName } = initialState.settings;
  const baseLogOptions = {
    format: initialState.settings.logFormat,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  // =================================================================
  // STEP 1: Create a new ProviderState
  // =================================================================
  const provider = newProvider(initialState.settings.url, initialState.settings.chainId);
  const state1 = state.update(initialState, { provider });

  // =================================================================
  // STEP 2: Get current block number and find or create the provider
  // =================================================================
  const providerFetchOptions = {
    adminAddress: state1.settings.adminAddress,
    airnodeAddress: state1.contracts.Airnode,
    convenienceAddress: state1.contracts.Convenience,
    provider: state1.provider,
  };
  const [providerLogs, providerBlockData] = await providers.findOrCreateProviderWithBlock(providerFetchOptions);
  logger.logPending(providerLogs, baseLogOptions);

  // We can't proceed until the provider has been created onchain
  if (!providerBlockData || !providerBlockData.providerExists) {
    return null;
  }

  const state2 = state.update(state1, { currentBlock: providerBlockData.blockNumber });

  // =================================================================
  // STEP 3: Get the pending actionable items from triggers
  // =================================================================
  const [dataErr, walletDataByIndexWithLogs] = await go(triggers.fetchWalletDataByIndex(state2));
  if (dataErr || !walletDataByIndexWithLogs) {
    logger.error('Unable to get pending requests and wallet data', { ...baseLogOptions, error: dataErr });
    return null;
  }
  logger.logPending(walletDataByIndexWithLogs[0], baseLogOptions);
  const state3 = state.update(state2, { walletDataByIndex: walletDataByIndexWithLogs[1] });

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
  const templatesAndTransactions = templatesAndTransactionResults.find(
    (result) => result.id === 'templates+authorizations'
  )!;
  const { authorizationsByEndpoint, templatedApiCalls } = templatesAndTransactions.data;

  const transactionCountsByAddress = templatesAndTransactionResults.find(
    (result) => result.id === 'transaction-counts'
  )!;
  logger.logPending(transactionCountsByAddress.logs!, baseLogOptions);

  // TODO: temporary workaround until wallet data by index is dropped
  const flatWithdrawals = grouping.flattenWithdrawals(state3.walletDataByIndex);
  const regroupedRequests = grouping.groupRequestsByWalletIndex({
    apiCalls: templatedApiCalls,
    withdrawals: flatWithdrawals,
  });
  const walletDataWithTransactionCounts = templates.mergeTemplatesAndTransactionCounts(
    regroupedRequests,
    transactionCountsByAddress.data
  );
  const state4 = state.update(state3, { walletDataByIndex: walletDataWithTransactionCounts });

  // =================================================================
  // STEP 5: Validate API calls now that all template fields are present
  // =================================================================
  const [verifyLogs, verifiedApiCalls] = verification.verifyDesignatedWallets(
    apiCalls.flatten(state4.walletDataByIndex)
  );
  logger.logPending(verifyLogs, baseLogOptions);

  // TODO: temporary workaround until wallet data by index is dropped
  const regroupedRequests2 = grouping.groupRequestsByWalletIndex({
    apiCalls: verifiedApiCalls,
    withdrawals: flatWithdrawals,
  });
  const state5 = state.update(state4, { walletDataByIndex: regroupedRequests2 });

  // =================================================================
  // STEP 6: Merge authorizations and transaction counts
  // =================================================================
  const [authLogs, walletDataWithAuthorizations] = authorization.mergeAuthorizations(
    walletDataWithTransactionCounts,
    authorizationsByEndpoint
  );
  logger.logPending(authLogs, baseLogOptions);

  const state6 = state.update(state5, { walletDataByIndex: walletDataWithAuthorizations });

  return state6;
}
