import * as evmProvider from '../evm/providers';
import { ChainConfig, ChainProvider, InitialCoordinatorConfig, ProviderState } from '../../types';

export async function initializeState(chain: ChainConfig, provider: ChainProvider, coordinatorConfig: InitialCoordinatorConfig) {
  if (chain.type === 'evm') {
    return evmProvider.initializeState(chain, provider, coordinatorConfig);
  }
  return null;
}

export async function processTransactions(initialState: ProviderState) {
  return evmProvider.processTransactions(initialState);
}
