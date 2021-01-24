import { go } from '../../utils/promise-utils';
import * as authorizations from '../authorization';
import * as logger from '../../logger';
import * as providers from '../providers';
import { fetchPendingRequests } from './fetch-pending-requests';
import * as requests from '../../requests';
import * as state from '../../providers/state';
import * as templates from '../templates';
import * as transactionCounts from '../transaction-counts';
import * as verification from '../verification';
import { EVMProviderState, PendingLog, ProviderState } from '../../types';

type ParallelPromise = Promise<{ id: string; data: any; logs: PendingLog[] }>;

async function fetchAuthorizations(currentState: ProviderState<EVMProviderState>) {
  const fetchOptions = {
    convenienceAddress: currentState.contracts.Convenience,
    provider: currentState.provider,
    providerId: currentState.settings.providerId,
  };
  const [logs, res] = await authorizations.fetch(currentState.requests.apiCalls, fetchOptions);
  return { id: 'authorizations', data: res, logs };
}

async function fetchTransactionCounts(currentState: ProviderState<EVMProviderState>) {
  const requesterIndices = requests.mapUniqueRequesterIndices(currentState.requests);
  const fetchOptions = {
    currentBlock: currentState.currentBlock!,
    masterHDNode: currentState.masterHDNode,
    provider: currentState.provider,
  };
  // This should not throw
  const [logs, res] = await transactionCounts.fetchByRequesterIndex(requesterIndices, fetchOptions);
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
  // STEP 1: Re-instantiate any classes
  // =================================================================
  const state1 = state.refresh(initialState);

  // =================================================================
  // STEP 2: Get current block number and find or create the provider
  // =================================================================
  const providerFetchOptions = {
    providerAdminForRecordCreation: state1.settings.providerAdminForRecordCreation,
    airnodeAddress: state1.contracts.Airnode,
    convenienceAddress: state1.contracts.Convenience,
    masterHDNode: state1.masterHDNode,
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
  const [dataErr, groupedRequests] = await go(fetchPendingRequests(state2));
  if (dataErr || !groupedRequests) {
    logger.error('Unable to get pending requests', { ...baseLogOptions, error: dataErr });
    return null;
  }
  const apiCalls = requests.filterActionableApiCalls(groupedRequests.apiCalls);
  const withdrawals = requests.filterActionableWithdrawals(groupedRequests.withdrawals);
  logger.info(`Pending requests: ${apiCalls.length} API call(s), ${withdrawals.length} withdrawal(s)`, baseLogOptions);
  const state3 = state.update(state2, { requests: groupedRequests });

  // =================================================================
  // STEP 4: Fetch and apply templates to API calls
  // =================================================================
  const templateFetchOptions = {
    airnodeAddress: state3.contracts.Airnode,
    convenienceAddress: state3.contracts.Convenience,
    provider: state3.provider,
  };
  // This should not throw
  const [templFetchLogs, templatesById] = await templates.fetch(state3.requests.apiCalls, templateFetchOptions);
  logger.logPending(templFetchLogs, baseLogOptions);

  const [templVerificationLogs, templVerifiedApiCalls] = templates.verify(apiCalls, templatesById);
  logger.logPending(templVerificationLogs, baseLogOptions);

  const [templApplicationLogs, templatedApiCalls] = templates.mergeApiCallsWithTemplates(
    templVerifiedApiCalls,
    templatesById
  );
  logger.logPending(templApplicationLogs, baseLogOptions);

  const state4 = state.update(state3, {
    requests: { ...state3.requests, apiCalls: templatedApiCalls },
  });

  // =================================================================
  // STEP 5: Validate API calls now that all template fields are present
  // =================================================================
  const [verifyLogs, verifiedApiCalls] = verification.verifyDesignatedWallets(
    state4.requests.apiCalls,
    state4.masterHDNode
  );
  logger.logPending(verifyLogs, baseLogOptions);

  const state5 = state.update(state4, {
    requests: { ...state4.requests, apiCalls: verifiedApiCalls },
  });

  // =================================================================
  // STEP 6: Fetch authorizations and transaction counts
  // =================================================================
  // NOTE: None of these promises cannot fail otherwise Promise.all will reject
  const authAndTxCountPromises: ParallelPromise[] = [fetchAuthorizations(state5), fetchTransactionCounts(state5)];
  const authAndTxResults = await Promise.all(authAndTxCountPromises);

  // These promises can resolve in any order, so we need to find each one by it's key
  const txCountRes = authAndTxResults.find((r) => r.id === 'transaction-counts')!;
  logger.logPending(txCountRes.logs, baseLogOptions);

  const authRes = authAndTxResults.find((r) => r.id === 'authorizations')!;
  logger.logPending(authRes.logs, baseLogOptions);

  const transactionCountsByRequesterIndex = txCountRes.data!;
  const authorizationsByRequestId = authRes.data!;

  const state6 = state.update(state5, { transactionCountsByRequesterIndex });

  // =================================================================
  // STEP 7: Apply authorization statuses to requests
  // =================================================================
  const [authLogs, authorizedApiCalls] = authorizations.mergeAuthorizations(
    state5.requests.apiCalls,
    authorizationsByRequestId
  );
  logger.logPending(authLogs, baseLogOptions);

  const state7 = state.update(state6, {
    requests: { ...state5.requests, apiCalls: authorizedApiCalls },
  });

  return state7;
}
