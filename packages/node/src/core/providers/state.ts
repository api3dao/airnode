import * as evm from '../evm';
import { removeKeys } from '../utils/object-utils';
import {
  ChainConfig,
  ChainProvider,
  ChainType,
  EVMProviderState,
  Config,
  ProviderSettings,
  ProviderState,
} from '../../types';

export function buildEVMState(
  coordinatorId: string,
  chain: ChainConfig,
  chainProvider: ChainProvider,
  config: Config
): ProviderState<EVMProviderState> {
  const masterHDNode = evm.getMasterHDNode();
  const provider = evm.buildEVMProvider(chainProvider.url, chain.id);

  const providerSettings: ProviderSettings = {
    adminAddressForCreatingProviderRecord: chain.adminAddressForCreatingProviderRecord,
    blockHistoryLimit: chainProvider.blockHistoryLimit || 600,
    chainId: chain.id,
    chainType: 'evm' as ChainType,
    logFormat: config.nodeSettings.logFormat,
    minConfirmations: chainProvider.minConfirmations || 0,
    name: chainProvider.name,
    providerId: evm.getProviderId(masterHDNode),
    providerIdShort: evm.getProviderIdShort(masterHDNode),
    region: config.nodeSettings.region,
    stage: config.nodeSettings.stage,
    url: chainProvider.url,
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

export function unscrub(state: ProviderState<any>) {
  if (state.settings.chainType === 'evm') {
    // The serverless function does not return an instance of an Ethereum
    // provider, so we create a new one before returning the state
    const masterHDNode = evm.getMasterHDNode();
    const provider = evm.buildEVMProvider(state.settings.url, state.settings.chainId);
    return update(state, { masterHDNode, provider }) as ProviderState<EVMProviderState>;
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
