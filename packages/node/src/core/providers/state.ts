import * as evm from '../evm';
import {
  ChainConfig,
  ChainProvider,
  ChainType,
  EVMProviderState,
  NodeSettings,
  ProviderSettings,
  ProviderState,
} from '../../types';

export function createEVMState(
  coordinatorId: string,
  chain: ChainConfig,
  chainProvider: ChainProvider,
  settings: NodeSettings
): ProviderState<EVMProviderState> {
  const provider = evm.newProvider(chainProvider.url, chain.id);
  const contracts = evm.contracts.build(chain);

  const providerSettings: ProviderSettings = {
    adminAddressForCreatingProviderRecord: chain.adminAddressForCreatingProviderRecord,
    blockHistoryLimit: chainProvider.blockHistoryLimit || 600,
    chainId: chain.id,
    chainType: 'evm' as ChainType,
    logFormat: settings.logFormat,
    minConfirmations: chainProvider.minConfirmations || 6,
    name: chainProvider.name,
    providerId: settings.providerId,
    url: chainProvider.url,
  };

  return {
    coordinatorId,
    provider,
    contracts,
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
