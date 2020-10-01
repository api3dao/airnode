import * as evmProvider from '../evm/providers';
import { ProviderConfig, ProviderState } from '../../types';

export async function initializeState(config: ProviderConfig, index: number): Promise<ProviderState | null> {
  return evmProvider.initializeState(config, index);
}

export async function processTransactions(initialState: ProviderState) {
  return evmProvider.processTransactions(initialState);
}
