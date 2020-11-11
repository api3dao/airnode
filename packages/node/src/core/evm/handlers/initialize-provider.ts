import { go } from '../../utils/promise-utils';
import * as authorization from '../authorization';
import * as logger from '../../logger';
import * as providers from '../providers';
import * as requests from '../requests';
import * as state from '../../providers/state';
import * as templates from '../templates';
import * as transactionCounts from '../transaction-counts';
import * as verification from '../verification';
import { newProvider } from '../retry-provider';
import { EVMProviderState, PendingLog, ProviderState } from '../../../types';

type ParallelPromise = Promise<{ id: string; data: any; logs: PendingLog[] }>;

async function fetchAuthorizations(currentState: ProviderState<EVMProviderState>) {
  const fetchOptions = {
    convenienceAddress: currentState.contracts.Convenience,
    provider: currentState.provider,
    providerId: currentState.settings.providerId,
  };
  const [logs, res] = await authorization.fetch(currentState.requests.apiCalls, fetchOptions);
  return { id: 'authorizations', data: res, logs };
}

async function fetchTransactionCounts(currentState: ProviderState<EVMProviderState>) {
  const requesterIndices = currentState.requests.apiCalls.map((a) => a.requesterIndex!);
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
  // STEP 1: Create a new ProviderState
  // =================================================================
  const provider = newProvider(initialState.settings.url, initialState.settings.chainId);
  const state1 = state.update(initialState, { provider });

  // =================================================================
  // STEP 2: Get current block number and find or create the provider
  // =================================================================
  const providerFetchOptions = {
    adminAddressForCreatingProviderRecord: state1.settings.adminAddressForCreatingProviderRecord,
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
  const [dataErr, groupedRequests] = await go(requests.fetchPendingRequests(state2));
  if (dataErr || !groupedRequests) {
    logger.error('Unable to get pending requests', { ...baseLogOptions, error: dataErr });
    return null;
  }
  const { apiCalls, withdrawals } = groupedRequests;
  logger.info(`Pending requests: ${apiCalls.length} API call(s), ${withdrawals.length} withdrawal(s)`, baseLogOptions);
  const state3 = state.update(state2, { requests: groupedRequests });

  // =================================================================
  // STEP 4: Fetch and apply templates to API calls
  // =================================================================
  const templateFetchOptions = {
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
  const txCountData = authAndTxResults.find((r) => r.id === 'transaction-counts')!;
  logger.logPending(txCountData.logs, baseLogOptions);

  // These promises can resolve in any order, so we need to find each one by it's key
  const authData = authAndTxResults.find((r) => r.id === 'authorizations')!;
  logger.logPending(authData.logs, baseLogOptions);

  const transactionCountsByRequesterIndex = txCountData.data!;
  const authorizationsByRequestId = authData.data!;

  const state6 = state.update(state5, { transactionCountsByRequesterIndex });

  // =================================================================
  // STEP 7: Apply authorization statuses to requests
  // =================================================================
  const [authLogs, authorizedApiCalls] = authorization.mergeAuthorizations(
    state5.requests.apiCalls,
    authorizationsByRequestId
  );
  logger.logPending(authLogs, baseLogOptions);

  const state7 = state.update(state6, {
    requests: { ...state5.requests, apiCalls: authorizedApiCalls },
  });

  return state7;
}
