import * as evm from '../evm';
import { ChainConfig, EVMProviderState, ProviderSettings, ProviderState } from '../../types';

function createEVMState(coordinatorId: string, chain: ChainConfig, settings: ProviderSettings): ProviderState<EVMProviderState> {
  const provider = evm.newProvider(settings.url, settings.chainId);
  const contracts = evm.contracts.create(chain);

  return {
    coordinatorId,
    settings,
    provider,
    contracts,
    currentBlock: null,
    gasPrice: null,
    walletDataByIndex: {},
  };
}

export function create(coordinatorId: string, chain: ChainConfig, settings: ProviderSettings) {
  if (chain.type === 'evm') {
    return createEVMState(coordinatorId, chain, settings);
  }
}

export function update<T>(state: ProviderState<T>, newState: Partial<ProviderState<T>>): ProviderState<T> {
  return { ...state, ...newState };
}
