import flatMap from 'lodash/flatMap';
import map from 'lodash/map';
import { randomHexString, removeKeys } from '@api3/airnode-utilities';
import * as evm from '../evm';
import { EVMProviderState, ProviderSettings, ProviderState, ProviderStates, EVMProviderSponsorState } from '../types';
import { BLOCK_COUNT_HISTORY_LIMIT, BLOCK_MIN_CONFIRMATIONS } from '../constants';
import { groupRequestsBySponsorAddress } from '../requests/grouping';
import { ChainConfig, ChainType, Config } from '../config';
import { deriveDeploymentId } from '../workers';

export function buildEVMState(
  coordinatorId: string,
  airnodeAddress: string,
  chain: ChainConfig,
  chainProviderName: string,
  config: Config
): ProviderState<EVMProviderState> {
  const masterHDNode = evm.getMasterHDNode(config);
  const chainProviderUrl = chain.providers[chainProviderName].url;
  const provider = evm.buildEVMProvider(chainProviderUrl, chain.id);
  const { cloudProvider, stage, nodeVersion } = config.nodeSettings;

  const providerSettings: ProviderSettings = {
    airnodeAddress,
    deploymentId: deriveDeploymentId(cloudProvider, airnodeAddress, stage, nodeVersion),
    authorizers: chain.authorizers,
    authorizations: chain.authorizations,
    // The number of blocks to look back for events to process
    blockHistoryLimit: chain.blockHistoryLimit || BLOCK_COUNT_HISTORY_LIMIT,
    chainId: chain.id,
    chainType: 'evm' as ChainType,
    chainOptions: chain.options,
    logFormat: config.nodeSettings.logFormat,
    logLevel: config.nodeSettings.logLevel,
    minConfirmations: chain.minConfirmations || BLOCK_MIN_CONFIRMATIONS,
    // If the _minConfirmations reserved parameter is set for one or more endpoints,
    // a request may override minConfirmations, but we don't know if it will or the value
    // until we fetch the requests and extract the _minConfirmations reserved parameter
    mayOverrideMinConfirmations: checkForMinConfirmationsReservedParam(config),
    name: chainProviderName,
    cloudProvider: config.nodeSettings.cloudProvider,
    stage: config.nodeSettings.stage,
    url: chainProviderUrl,
    xpub: evm.getExtendedPublicKey(masterHDNode),
  };

  return {
    id: randomHexString(32),
    config,
    contracts: chain.contracts,
    coordinatorId,
    masterHDNode,
    currentBlock: null,
    provider,
    settings: providerSettings,
    gasTarget: null,
    requests: {
      apiCalls: [],
      withdrawals: [],
    },
    transactionCountsBySponsorAddress: {},
  };
}

// Checks all OIS endpoints for the presence of a _minConfirmations reserved parameter
// which means that a requester may use a parameter to override the value.
export function checkForMinConfirmationsReservedParam(config: Config): boolean {
  return config.ois.some((ois) =>
    ois.endpoints.some((endpoint) => endpoint.reservedParameters.some((param) => param.name === '_minConfirmations'))
  );
}

export function update<T>(state: ProviderState<T>, newState: Partial<ProviderState<T>>): ProviderState<T> {
  return { ...state, ...newState };
}

export function scrub<T>(state: ProviderState<T>): ProviderState<T> {
  // The 'config' object can be quite large so we don't want to return it to the coordinator
  // from each spawned worker function. Doing so would bloat the coordinator state
  // unnecessarily. The coordinator already has access to the config object.
  //
  // The 'masterHDNode' and the 'provider' keys are class instances. These do not typically transfer
  // well and are better off being re-instantiated with the 'refresh(state)' function.
  return removeKeys(state, ['config', 'masterHDNode', 'provider']) as ProviderState<T>;
}

export function refresh<T extends EVMProviderState>(state: ProviderState<T>) {
  if (state.settings.chainType === 'evm') {
    // The serverless function does not return an instance of an Ethereum
    // provider, so we create a new one before returning the state
    const masterHDNode = evm.getMasterHDNode(state.config!);
    const provider = evm.buildEVMProvider(state.settings.url, state.settings.chainId);
    return update(state, { masterHDNode, provider } as Partial<ProviderState<T>>);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}

export function splitStatesBySponsorAddress(providerStates: ProviderStates): ProviderState<EVMProviderSponsorState>[] {
  return flatMap(providerStates.evm, (providerState) => {
    const groupedRequests = groupRequestsBySponsorAddress(providerState.requests);
    return map(groupedRequests, (requests, sponsorAddress) => ({ ...providerState, requests, sponsorAddress }));
  });
}
