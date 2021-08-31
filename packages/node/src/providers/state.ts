import * as evm from '../evm';
import { randomString, removeKeys } from '../utils';
import { ChainConfig, ChainType, EVMProviderState, Config, ProviderSettings, ProviderState } from '../types';
import { BLOCK_COUNT_HISTORY_LIMIT, BLOCK_COUNT_IGNORE_LIMIT, BLOCK_MIN_CONFIRMATIONS } from '../constants';

export function buildEVMState(
  coordinatorId: string,
  chain: ChainConfig,
  chainProviderName: string,
  config: Config
): ProviderState<EVMProviderState> {
  const masterHDNode = evm.getMasterHDNode(config);
  const chainProviderUrl = chain.providers[chainProviderName].url || '';
  const provider = evm.buildEVMProvider(chainProviderUrl, chain.id);
  const airnodeAddress = evm.getAirnodeWallet().address;

  const providerSettings: ProviderSettings = {
    airnodeAddress,
    airnodeAddressShort: evm.getAirnodeAddressShort(airnodeAddress),
    authorizers: chain.authorizers,
    // The number of blocks to look back for events to process
    blockHistoryLimit: chain.blockHistoryLimit || BLOCK_COUNT_HISTORY_LIMIT,
    chainId: chain.id,
    chainType: 'evm' as ChainType,
    // If this number of blocks has passed, then ignore requests instead of blocking them
    ignoreBlockedRequestsAfterBlocks: chain.ignoreBlockedRequestsAfterBlocks || BLOCK_COUNT_IGNORE_LIMIT,
    logFormat: config.nodeSettings.logFormat,
    logLevel: config.nodeSettings.logLevel,
    minConfirmations: chain.minConfirmations || BLOCK_MIN_CONFIRMATIONS,
    name: chainProviderName,
    region: config.nodeSettings.region,
    stage: config.nodeSettings.stage,
    url: chainProviderUrl,
    xpub: evm.getExtendedPublicKey(masterHDNode),
  };

  return {
    id: randomString(16),
    config,
    contracts: chain.contracts,
    coordinatorId,
    masterHDNode,
    currentBlock: null,
    provider,
    settings: providerSettings,
    gasPrice: null,
    requests: {
      apiCalls: [],
      withdrawals: [],
    },
    transactionCountsBySponsorAddress: {},
  };
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

export function refresh(state: ProviderState<any>) {
  if (state.settings.chainType === 'evm') {
    // The serverless function does not return an instance of an Ethereum
    // provider, so we create a new one before returning the state
    const masterHDNode = evm.getMasterHDNode(state.config);
    const provider = evm.buildEVMProvider(state.settings.url, state.settings.chainId);
    return update(state, { masterHDNode, provider }) as ProviderState<EVMProviderState>;
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
