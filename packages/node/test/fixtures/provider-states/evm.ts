import { ethers } from 'ethers';
import { buildEVMState } from '../../../src/providers/state';
import { buildConfig } from '../config';
import { ChainConfig, EVMProviderState, ProviderState } from '../../../src/types';

export function buildEVMProviderState(
  overrides?: Partial<ProviderState<EVMProviderState>>
): ProviderState<EVMProviderState> {
  const coordinatorId = '837daEf231';
  const chainType = 'evm';
  const chainId = '1337';
  const chainProviderName = 'Ganache test';
  const chainConfig: ChainConfig = {
    authorizers: [ethers.constants.AddressZero],
    contracts: {
      AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
    },
    id: chainId,
    type: chainType,
    providers: {
      [chainProviderName]: {
        url: 'http://localhost:4111',
      },
    },
  };
  const config = buildConfig({ chains: [chainConfig] });
  const state = buildEVMState(coordinatorId, chainConfig, chainProviderName, config);
  return {
    ...state,
    ...overrides,
  };
}
