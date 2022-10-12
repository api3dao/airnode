import flatMap from 'lodash/flatMap';
import mergeWith from 'lodash/mergeWith';
import { logger, PendingLog } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { fetchPendingRequests } from './fetch-pending-requests';
import * as authorizations from '../authorization';
import * as requests from '../../requests';
import * as state from '../../providers/state';
import * as templates from '../templates';
import * as transactionCounts from '../transaction-counts';
import * as verification from '../verification';
import { buildEVMProvider } from '../evm-provider';
import { AuthorizationByRequestId, EVMProviderState, ProviderState } from '../../types';

type ParallelPromise = Promise<{ readonly id: string; readonly data: any; readonly logs: PendingLog[] }>;

async function fetchSameChainAuthorizations(currentState: ProviderState<EVMProviderState>) {
  const fetchOptions: authorizations.FetchOptions = {
    requesterEndpointAuthorizers: currentState.settings.authorizers.requesterEndpointAuthorizers,
    authorizations: currentState.settings.authorizations,
    airnodeAddress: currentState.settings.airnodeAddress,
    airnodeRrpAddress: currentState.contracts.AirnodeRrp,
    provider: currentState.provider,
  };
  const [logs, res] = await authorizations.fetch(currentState.requests.apiCalls, fetchOptions);
  return { id: 'authorizations', data: res, logs };
}

async function fetchCrossChainAuthorizations(currentState: ProviderState<EVMProviderState>) {
  const promises = currentState.settings.authorizers.crossChainRequesterAuthorizers.map(async (authorizer) => {
    const fetchOptions: authorizations.FetchOptions = {
      requesterEndpointAuthorizers: authorizer.requesterEndpointAuthorizers,
      authorizations: currentState.settings.authorizations,
      airnodeAddress: currentState.settings.airnodeAddress,
      airnodeRrpAddress: authorizer.contracts.AirnodeRrp,
      provider: buildEVMProvider(authorizer.chainProvider.url, authorizer.chainId),
    };
    const result = await authorizations.fetch(currentState.requests.apiCalls, fetchOptions);
    return result;
  });

  const responses = await Promise.all(promises);
  const logs = flatMap(responses, (r) => r[0]);
  const authorizationStatuses = responses.map((r) => r[1]);

  return { id: 'crossChainAuthorizations', data: authorizationStatuses, logs };
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

export function mergeAuthorizationsByRequestId(authorizations: AuthorizationByRequestId[]): AuthorizationByRequestId {
  const merged = mergeWith({}, ...authorizations, (objVal: boolean, srcVal: boolean) => {
    // authorized if any authorizer has authorized (logical OR)
    if (objVal === true || srcVal === true) {
      return true;
    } else {
      return false;
    }
  });
  return merged;
}

export async function initializeProvider(
  initialState: ProviderState<EVMProviderState>
): Promise<ProviderState<EVMProviderState> | null> {
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
  const goGroupedRequests = await go(() => fetchPendingRequests(state2));
  if (!goGroupedRequests.success) {
    logger.error('Unable to get pending requests', goGroupedRequests.error);
    return null;
  }
  const apiCalls = goGroupedRequests.data.apiCalls;
  const withdrawals = goGroupedRequests.data.withdrawals;
  logger.info(`Pending requests: ${apiCalls.length} API call(s), ${withdrawals.length} withdrawal(s)`);
  const state3 = state.update(state2, { requests: goGroupedRequests.data });

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
  logger.logPending(templateFetchLogs);

  const [templApplicationLogs, templatedApiCalls] = templates.mergeApiCallsWithTemplates(
    state3.requests.apiCalls,
    templatesById
  );
  logger.logPending(templApplicationLogs);

  const state4 = state.update(state3, {
    requests: { ...state3.requests, apiCalls: templatedApiCalls },
  });

  // =================================================================
  // STEP 5: Verify requests
  // =================================================================
  const [verifyRrpTriggersLogs, verifiedApiCallsForRrpTriggers] = verification.verifyRrpTriggers(
    state4.requests.apiCalls,
    state4.config!.triggers.rrp
  );
  logger.logPending(verifyRrpTriggersLogs);

  const state5 = state.update(state4, {
    requests: {
      ...state4.requests,
      apiCalls: verifiedApiCallsForRrpTriggers,
    },
  });

  // =================================================================
  // STEP 6: Fetch authorizations and transaction counts
  // =================================================================
  // NOTE: None of these promises can fail otherwise Promise.all will reject
  const authAndTxCountPromises: readonly ParallelPromise[] = [
    fetchSameChainAuthorizations(state5),
    fetchTransactionCounts(state5),
    fetchCrossChainAuthorizations(state5),
  ];
  const authAndTxResults = await Promise.all(authAndTxCountPromises);

  // These promises can resolve in any order, so we need to find each one by it's key
  const txCountRes = authAndTxResults.find((r) => r.id === 'transaction-counts')!;
  logger.logPending(txCountRes.logs);

  const authRes = authAndTxResults.find((r) => r.id === 'authorizations')!;
  logger.logPending(authRes.logs);

  const crossAuthRes = authAndTxResults.find((r) => r.id === 'crossChainAuthorizations')!;
  logger.logPending(crossAuthRes.logs);

  const transactionCountsBySponsorAddress = txCountRes.data!;

  // Merge authorization statuses
  const authorizationsByRequestId: AuthorizationByRequestId = authRes.data!;
  const crossAuthorizationsByRequestId: AuthorizationByRequestId[] = crossAuthRes.data!;
  const mergedAuthorizationsByRequestId = mergeAuthorizationsByRequestId([
    authorizationsByRequestId,
    ...crossAuthorizationsByRequestId,
  ]);
  const state6 = state.update(state5, { transactionCountsBySponsorAddress });

  // =================================================================
  // STEP 7: Apply authorization statuses to requests
  // =================================================================
  const [authLogs, authorizedApiCalls] = authorizations.mergeAuthorizations(
    state5.requests.apiCalls,
    mergedAuthorizationsByRequestId
  );
  logger.logPending(authLogs);

  const state7 = state.update(state6, {
    requests: { ...state6.requests, apiCalls: authorizedApiCalls },
  });

  return state7;
}
