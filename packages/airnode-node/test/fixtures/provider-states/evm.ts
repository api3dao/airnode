import { buildEVMState } from '../../../src/providers/state';
import { buildConfig } from '../config';
import { ChainConfig, EVMProviderState, EVMProviderSponsorState, ProviderState } from '../../../src/types';

export function buildEVMProviderState(
  overrides?: Partial<ProviderState<EVMProviderState>>
): ProviderState<EVMProviderState> {
  const coordinatorId = '837daEf231';
  const chainType = 'evm';
  const chainId = '1337';
  const chainProviderName = 'Ganache test';
  const chainConfig: ChainConfig = {
    maxConcurrency: 100,
    authorizers: [],
    contracts: {
      AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
    },
    id: chainId,
    type: chainType,
    options: {} as any,
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

export function buildEVMProviderSponsorState(
  overrides?: Partial<ProviderState<EVMProviderSponsorState>>
): ProviderState<EVMProviderSponsorState> {
  return { ...buildEVMProviderState(), sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181', ...overrides };
}
