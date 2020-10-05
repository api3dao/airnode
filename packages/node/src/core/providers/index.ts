import * as evmProvider from '../evm/providers';
import { EVMProviderState, ProviderState } from '../../types';

// "Pipeline" functions
export async function initializeState(state: ProviderState<any>) {
  if (state.settings.chainType === 'evm') {
    return evmProvider.initializeState(state as ProviderState<EVMProviderState>);
  }
  return null;
}

export async function processTransactions(state: ProviderState<any>) {
  if (state.settings.chainType === 'evm') {
    return evmProvider.processTransactions(state as ProviderState<EVMProviderState>);
  }
  return null;
}
