import { buildEVMState } from '../../../src/providers/state';
import { buildConfig } from '../config';
import { EVMProviderState, EVMProviderSponsorState, ProviderState } from '../../../src/types';
import { ChainConfig } from '../../../src/config';

export function buildEVMProviderState(
  overrides?: Partial<ProviderState<EVMProviderState>>
): ProviderState<EVMProviderState> {
  const coordinatorId = '837daEf231';
  const chainType = 'evm';
  const chainId = '31337';
  const chainProviderName = 'Ganache test';
  const airnodeAddress = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace';
  const chainConfig: ChainConfig = {
    maxConcurrency: 100,
    authorizers: {
      requesterEndpointAuthorizers: [],
      crossChainRequesterAuthorizers: [],
      requesterAuthorizersWithErc721: [],
      crossChainRequesterAuthorizersWithErc721: [],
    },
    authorizations: {
      requesterEndpointAuthorizations: {},
    },
    contracts: {
      AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
    },
    id: chainId,
    type: chainType,
    options: {
      fulfillmentGasLimit: 123456,
      gasPriceOracle: [
        {
          gasPriceStrategy: 'latestBlockPercentileGasPrice',
          percentile: 60,
          minTransactionCount: 20,
          pastToCompareInBlocks: 20,
          maxDeviationMultiplier: 2,
        },
        {
          gasPriceStrategy: 'providerRecommendedGasPrice',
          recommendedGasPriceMultiplier: 1.2,
        },
        {
          gasPriceStrategy: 'constantGasPrice',
          gasPrice: {
            value: 10,
            unit: 'gwei',
          },
        },
      ],
    },
    providers: {
      [chainProviderName]: {
        url: 'http://localhost:4111',
      },
    },
  };
  const config = buildConfig({ chains: [chainConfig] });
  const state = buildEVMState(coordinatorId, airnodeAddress, chainConfig, chainProviderName, config);
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
