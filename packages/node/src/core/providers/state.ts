import * as evm from '../evm';
import { ProviderConfig, ProviderState } from '../../types';

export function create(config: ProviderConfig, index: number): ProviderState {
  return {
    config,
    currentBlock: null,
    index,
    provider: evm.newProvider(config.url, config.chainId),
    walletDataByIndex: {},
    // This is fetched and set as late as possible for freshness
    gasPrice: null,
  };
}

export function update(state: ProviderState, newState: Partial<ProviderState>): ProviderState {
  return { ...state, ...newState };
}
