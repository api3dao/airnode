import * as evm from '../evm';
import { getConfigSecret } from '../config';
import { removeKeys } from '../utils/object-utils';
import { ChainConfig, ChainType, EVMProviderState, Config, ProviderSettings, ProviderState } from '../types';
import { BLOCK_COUNT_HISTORY_LIMIT, BLOCK_COUNT_IGNORE_LIMIT, BLOCK_MIN_CONFIRMATIONS } from '../constants';

export function buildEVMState(
  coordinatorId: string,
  chain: ChainConfig,
  chainProviderName: string,
  config: Config
): ProviderState<EVMProviderState> {
  const masterHDNode = evm.getMasterHDNode();
  const chainProviderEnvironmentConfig = config.environment.chainProviders.find(
    (c) => c.chainType === chain.type && c.chainId === chain.id && c.name === chainProviderName
  );
  if (!chainProviderEnvironmentConfig) {
    throw new Error(
      `Chain provider URL environment variable name for type: ${chain.type}, ID: ${chain.id}, provider name: ${chainProviderName} must be defined in the provided config object`
    );
  }
  const chainProviderUrl = getConfigSecret(chainProviderEnvironmentConfig.envName) || '';
  const provider = evm.buildEVMProvider(chainProviderUrl, chain.id);

  const providerSettings: ProviderSettings = {
    airnodeAdmin: chain.airnodeAdmin,
    airnodeId: evm.getAirnodeId(masterHDNode),
    airnodeIdShort: evm.getAirnodeIdShort(masterHDNode),
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
    config,
    contracts: chain.contracts,
    coordinatorId,
    masterHDNode,
    provider,
    settings: providerSettings,
    currentBlock: null,
    gasPrice: null,
    requests: {
      apiCalls: [],
      withdrawals: [],
    },
    transactionCountsByRequesterIndex: {},
  };
}

export function update<T>(state: ProviderState<T>, newState: Partial<ProviderState<T>>): ProviderState<T> {
  return { ...state, ...newState };
}

export function scrub<T>(state: ProviderState<T>): ProviderState<T> {
  // Certain keys we do not want to return to calling functions when returning a provider state
  return removeKeys(state, ['config', 'masterHDNode', 'provider']) as ProviderState<T>;
}

export function refresh(state: ProviderState<any>) {
  if (state.settings.chainType === 'evm') {
    // The serverless function does not return an instance of an Ethereum
    // provider, so we create a new one before returning the state
    const masterHDNode = evm.getMasterHDNode();
    const provider = evm.buildEVMProvider(state.settings.url, state.settings.chainId);
    return update(state, { masterHDNode, provider }) as ProviderState<EVMProviderState>;
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
