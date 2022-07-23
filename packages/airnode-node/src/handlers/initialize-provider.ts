import * as evm from '../evm/handlers';
import { EVMProviderState, ProviderState } from '../types';

export function initializeProvider(state: ProviderState<EVMProviderState>) {
  if (state.settings.chainType === 'evm') {
    return evm.initializeProvider(state);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
