import * as evm from '../evm/handlers';
import { EVMProviderSponsorState, ProviderState } from '../types';

export function processTransactions(state: ProviderState<EVMProviderSponsorState>) {
  if (state.settings.chainType === 'evm') {
    return evm.processTransactions(state);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
