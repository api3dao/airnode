import * as evm from '../evm';
import {
  ChainConfig,
  ChainProvider,
  ChainType,
  CoordindatorSettings,
  EVMProviderState,
  ProviderState,
} from '../../types';

export function createEVMState(
  coordinatorId: string,
  chain: ChainConfig,
  chainProvider: ChainProvider,
  coordinatorSettings: CoordindatorSettings
): ProviderState<EVMProviderState> {
  const provider = evm.newProvider(chainProvider.url, chain.id);
  const contracts = evm.contracts.create(chain);

  const settings = {
    blockHistoryLimit: chainProvider.blockHistoryLimit || 600,
    chainId: chain.id,
    chainType: 'evm' as ChainType,
    logFormat: coordinatorSettings.logFormat,
    minConfirmations: chainProvider.minConfirmations || 6,
    name: chainProvider.name,
    url: chainProvider.url,
  };

  return {
    settings,
    coordinatorId,
    provider,
    contracts,
    currentBlock: null,
    gasPrice: null,
    walletDataByIndex: {},
  };
}

export function update<T>(state: ProviderState<T>, newState: Partial<ProviderState<T>>): ProviderState<T> {
  return { ...state, ...newState };
}
