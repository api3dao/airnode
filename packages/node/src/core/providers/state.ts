import * as evm from '../evm';
import { ChainConfig, EVMProviderState, EVMSettings, ProviderSettings, ProviderState } from '../../types';

function createEVMState(coordinatorId: string, settings: ProviderSettings<EVMSettings>): ProviderState<EVMProviderState> {
  const provider = evm.newProvider(settings.url, settings.chainId);

  return {
    coordinatorId,
    settings: { ...settings, type: 'evm' },
    provider,
    currentBlock: null,
    gasPrice: null,
    walletDataByIndex: {},
  };
}

export function create(coordinatorId: string, chain: ChainConfig, settings: ProviderSettings<any>) {
  if (chain.type === 'evm') {
    return createEVMState(coordinatorId, settings);
  }
}

export function update<T>(state: ProviderState<T>, newState: Partial<ProviderState<T>>): ProviderState<T> {
  return { ...state, ...newState };
}
