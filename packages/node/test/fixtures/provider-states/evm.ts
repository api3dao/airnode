import { ChainConfig, ChainProvider, EVMProviderState, ProviderState } from '../../../src/types';
import { buildEVMState } from '../../../src/core/providers/state';
import { buildConfig, buildNodeSettings } from '../config';

export function buildEVMProviderState(
  overrides?: Partial<ProviderState<EVMProviderState>>
): ProviderState<EVMProviderState> {
  const coordinatorId = '837daEf231';
  const chainProvider: ChainProvider = { name: 'ganache-test', url: 'http://localhost:4111' };
  const chainConfig: ChainConfig = {
    adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    id: 1337,
    type: 'evm',
    providers: [chainProvider],
  };
  const nodeSettings = buildNodeSettings({ chains: [chainConfig] });
  const config = buildConfig({ nodeSettings });
  const state = buildEVMState(coordinatorId, chainConfig, chainProvider, config);
  return {
    ...state,
    ...overrides,
  };
}
