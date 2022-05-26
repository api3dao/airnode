import { go, logger, PendingLog } from '@api3/airnode-utilities';
import { fetchPendingRequests } from './fetch-pending-requests';
import * as authorizations from '../authorization';
import * as requests from '../../requests';
import * as state from '../../providers/state';
import * as templates from '../templates';
import * as transactionCounts from '../transaction-counts';
import * as verification from '../verification';
import { EVMProviderState, ProviderState } from '../../types';

type ParallelPromise = Promise<{ readonly id: string; readonly data: any; readonly logs: PendingLog[] }>;

async function fetchAuthorizations(currentState: ProviderState<EVMProviderState>) {
  const fetchOptions: authorizations.FetchOptions = {
    authorizers: currentState.settings.authorizers,
    airnodeAddress: currentState.settings.airnodeAddress,
    airnodeRrpAddress: currentState.contracts.AirnodeRrp,
    provider: currentState.provider,
  };
  const [logs, res] = await authorizations.fetch(currentState.requests.apiCalls, fetchOptions);
  return { id: 'authorizations', data: res, logs };
}

async function fetchTransactionCounts(currentState: ProviderState<EVMProviderState>) {
  const sponsors = requests.mapUniqueSponsorAddresses(currentState.requests);
  const fetchOptions = {
    currentBlock: currentState.currentBlock!,
    masterHDNode: currentState.masterHDNode,
    provider: currentState.provider,
    minConfirmations: currentState.settings.minConfirmations,
  };
  // This should not throw
  const [logs, res] = await transactionCounts.fetchBySponsor(sponsors, fetchOptions);
  return { id: 'transaction-counts', data: res, logs };
}

export async function initializeProvider(
  initialState: ProviderState<EVMProviderState>
): Promise<ProviderState<EVMProviderState> | null> {
  const { coordinatorId } = initialState;
  const { chainId, chainType, name: providerName } = initialState.settings;
  const baseLogOptions = {
    format: initialState.settings.logFormat,
    level: initialState.settings.logLevel,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  // =================================================================
  // STEP 1: Re-instantiate any classes
  // =================================================================
  const state1 = state.refresh(initialState);

  // =================================================================
  // STEP 2: Get current block number
  // =================================================================
  const currentBlock = await state1.provider.getBlockNumber();
  const state2 = state.update(state1, { currentBlock });

  // =================================================================
  // STEP 3: Get the pending actionable items from triggers
  // =================================================================
  const [dataErr, groupedRequests] = await go(() => fetchPendingRequests(state2));
  if (dataErr || !groupedRequests) {
    logger.error('Unable to get pending requests', { ...baseLogOptions, error: dataErr });
    return null;
  }
  const apiCalls = groupedRequests.apiCalls;
  const withdrawals = groupedRequests.withdrawals;
  logger.info(`Pending requests: ${apiCalls.length} API call(s), ${withdrawals.length} withdrawal(s)`, baseLogOptions);
  const state3 = state.update(state2, { requests: groupedRequests });

  // =================================================================
  // STEP 4: Fetch and apply templates to API calls
  // =================================================================
  const templateFetchOptions = {
    airnodeRrpAddress: state3.contracts.AirnodeRrp,
    provider: state3.provider,
    configTemplates: state3.config!.templates,
    airnodeAddress: state3.settings.airnodeAddress,
  };
  // This should not throw
  const [templateFetchLogs, templatesById] = await templates.fetch(state3.requests.apiCalls, templateFetchOptions);
  logger.logPending(templateFetchLogs, baseLogOptions);

  const [templApplicationLogs, templatedApiCalls] = templates.mergeApiCallsWithTemplates(
    state3.requests.apiCalls,
    templatesById
  );
  logger.logPending(templApplicationLogs, baseLogOptions);

  const state4 = state.update(state3, {
    requests: { ...state3.requests, apiCalls: templatedApiCalls },
  });

  // =================================================================
  // STEP 5: Verify requests
  // =================================================================
  const [verifyRrpTriggersLogs, verifiedApiCallsForRrpTriggers] = verification.verifyRrpTriggers(
    state4.requests.apiCalls,
    state4.config!.triggers.rrp,
    state4.config!.ois
  );
  logger.logPending(verifyRrpTriggersLogs, baseLogOptions);

  const state5 = state.update(state4, {
    requests: {
      ...state4.requests,
      apiCalls: verifiedApiCallsForRrpTriggers,
    },
  });

  // =================================================================
  // STEP 6: Fetch authorizations and transaction counts
  // =================================================================
  // NOTE: None of these promises cannot fail otherwise Promise.all will reject
  const authAndTxCountPromises: readonly ParallelPromise[] = [
    fetchAuthorizations(state5),
    fetchTransactionCounts(state5),
  ];
  const authAndTxResults = await Promise.all(authAndTxCountPromises);

  // These promises can resolve in any order, so we need to find each one by it's key
  const txCountRes = authAndTxResults.find((r) => r.id === 'transaction-counts')!;
  logger.logPending(txCountRes.logs, baseLogOptions);

  const authRes = authAndTxResults.find((r) => r.id === 'authorizations')!;
  logger.logPending(authRes.logs, baseLogOptions);

  const transactionCountsBySponsorAddress = txCountRes.data!;
  const authorizationsByRequestId = authRes.data!;

  const state6 = state.update(state5, { transactionCountsBySponsorAddress });

  // =================================================================
  // STEP 7: Apply authorization statuses to requests
  // =================================================================
  const [authLogs, authorizedApiCalls] = authorizations.mergeAuthorizations(
    state5.requests.apiCalls,
    authorizationsByRequestId
  );
  logger.logPending(authLogs, baseLogOptions);

  const state7 = state.update(state6, {
    requests: { ...state6.requests, apiCalls: authorizedApiCalls },
  });

  return state7;
}
