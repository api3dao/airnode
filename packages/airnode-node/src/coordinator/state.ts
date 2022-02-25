import { randomHexString } from '@api3/airnode-utilities';
import * as wallet from '../evm/wallet';
import { Config, CoordinatorSettings, CoordinatorState } from '../types';

export function create(config: Config): CoordinatorState {
  const coordinatorId = randomHexString(16);
  const airnodeAddress = wallet.getAirnodeWallet(config).address;
  const airnodeAddressShort = wallet.getAirnodeAddressShort(airnodeAddress);

  const settings: CoordinatorSettings = {
    airnodeAddress,
    airnodeAddressShort,
    logFormat: config.nodeSettings.logFormat,
    logLevel: config.nodeSettings.logLevel,
    stage: config.nodeSettings.stage,
    cloudProvider: config.nodeSettings.cloudProvider,
  };

  return {
    coordinatorId,
    config,
    settings,
    aggregatedApiCallsById: {},
    providerStates: { evm: [] },
  };
}

export function update(state: CoordinatorState, newState: Partial<CoordinatorState>): CoordinatorState {
  return { ...state, ...newState };
}
