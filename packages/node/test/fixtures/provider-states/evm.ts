import { buildEVMState } from '../../../src/providers/state';
import { buildConfig } from '../config';
import { ChainConfig, EnvironmentConfig, EVMProviderState, ProviderState } from '../../../src/types';

export function buildEVMProviderState(
  overrides?: Partial<ProviderState<EVMProviderState>>
): ProviderState<EVMProviderState> {
  const coordinatorId = '837daEf231';
  const chainType = 'evm';
  const chainId = '1337';
  const chainProviderName = 'Ganache test';
  const chainProviderEnvName = 'CP_EVM_1337_GANACHE_TEST';
  const chainConfig: ChainConfig = {
    authorizers: [],
    contracts: {
      AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
    },
    id: chainId,
    type: chainType,
    providerNames: [chainProviderName],
  };
  const environmentConfig: EnvironmentConfig = {
    securitySchemes: [],
    chainProviders: [
      {
        chainType: chainType,
        chainId: chainId,
        name: chainProviderName,
        envName: chainProviderEnvName,
      },
    ],
  };
  const config = buildConfig({ chains: [chainConfig], environment: environmentConfig });
  const state = buildEVMState(coordinatorId, chainConfig, chainProviderName, config);
  return {
    ...state,
    ...overrides,
  };
}
