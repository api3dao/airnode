import * as evm from '../evm/handlers';
import { EVMProviderState, ProviderState } from '../types';

export function processTransactions(state: ProviderState<EVMProviderState>) {
  if (state.settings.chainType === 'evm') {
    return evm.processTransactions(state);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
