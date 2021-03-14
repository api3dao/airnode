import { ethers } from 'ethers';
import { buildEVMState } from '../../../src/providers/state';
import { buildConfig, buildNodeSettings } from '../config';
import { ChainConfig, ChainProvider, EVMProviderState, ProviderState } from 'src/types';

export function buildEVMProviderState(
  overrides?: Partial<ProviderState<EVMProviderState>>
): ProviderState<EVMProviderState> {
  const coordinatorId = '837daEf231';
  const chainProvider: ChainProvider = { name: 'ganache-test', url: 'http://localhost:4111' };
  const chainConfig: ChainConfig = {
    airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    authorizers: [ethers.constants.AddressZero],
    contracts: {
      AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
    },
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
