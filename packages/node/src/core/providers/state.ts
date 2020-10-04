import * as evm from '../evm';
import { ChainConfig, EVMProviderState, ProviderSettings, ProviderState } from '../../types';

interface Overrides {
  coordinatorId: string;
}

function createEVMState(chain: ChainConfig, settings: ProviderSettings, overrides: Overrides): ProviderState<EVMProviderState> {
  const provider = evm.newProvider(settings.url, settings.chainId);
  const contracts = evm.contracts.create(chain);

  return {
    settings,
    provider,
    contracts,
    currentBlock: null,
    gasPrice: null,
    walletDataByIndex: {},
    ...overrides,
  };
}

export function create(chain: ChainConfig, settings: ProviderSettings, overrides: Overrides) {
  if (chain.type === 'evm') {
    return createEVMState(chain, settings, overrides);
  }
}

export function update<T>(state: ProviderState<T>, newState: Partial<ProviderState<T>>): ProviderState<T> {
  return { ...state, ...newState };
}
