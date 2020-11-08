import * as evm from '../evm';
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
  const provider = evm.newProvider(chainProvider.url, chain.id);
  const contracts = evm.contracts.build(chain);

  const providerSettings: ProviderSettings = {
    adminAddressForCreatingProviderRecord: chain.adminAddressForCreatingProviderRecord,
    blockHistoryLimit: chainProvider.blockHistoryLimit || 600,
    chainId: chain.id,
    chainType: 'evm' as ChainType,
    logFormat: config.nodeSettings.logFormat,
    minConfirmations: chainProvider.minConfirmations || 6,
    name: chainProvider.name,
    // TODO: derive from mnemonic
    providerId: config.nodeSettings.providerId,
    url: chainProvider.url,
  };

  return {
    coordinatorId,
    provider,
    contracts,
    config,
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
