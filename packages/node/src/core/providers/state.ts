import * as evm from '../evm';
import { ProviderSettings, ProviderState } from '../../types';

export function create<T>(settings: ProviderSettings<T>) {
  if (settings.) {

  }

  return {
    settings,
    currentBlock: null,
    gasPrice: null,
    provider: evm.newProvider(settings.provider.url, settings.chainId),
    walletDataByIndex: {},
  };
}

export function update(state: ProviderState, newState: Partial<ProviderState>): ProviderState {
  return { ...state, ...newState };
}
