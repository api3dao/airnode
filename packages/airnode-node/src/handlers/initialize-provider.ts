import { setLogOptions } from '@api3/airnode-utilities';
import * as evm from '../evm/handlers';
import { EVMProviderState, ProviderState } from '../types';

export function initializeProvider(state: ProviderState<EVMProviderState>) {
  const { settings, coordinatorId } = state;
  const { logFormat, logLevel, name: providerName, chainType, chainId } = settings;
  setLogOptions({
    format: logFormat,
    level: logLevel,
    meta: { coordinatorId, providerName, chainType, chainId },
  });

  if (state.settings.chainType === 'evm') {
    return evm.initializeProvider(state);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
