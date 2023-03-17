import { parseConfig } from '@api3/airnode-validator';
import * as ois from './ois';
import * as settings from './node-settings';
import { ApiCredentials, Config, RrpTrigger, Trigger } from '../../../src/config';

export function buildTrigger(overrides?: Partial<Trigger>): Trigger {
  return {
    endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
    endpointName: 'convertToUSD',
    oisTitle: 'Currency Converter API',
    ...overrides,
  };
}

export function buildRrpTrigger(overrides?: Partial<RrpTrigger>): RrpTrigger {
  return {
    endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
    endpointName: 'convertToUSD',
    oisTitle: 'Currency Converter API',
    cacheResponses: false,
    ...overrides,
  };
}

export function buildApiCredentials(overrides?: Partial<ApiCredentials>): ApiCredentials {
  return {
    securitySchemeName: 'myApiSecurityScheme',
    securitySchemeValue: 'supersecret',
    oisTitle: 'Currency Converter API',
    ...overrides,
  };
}

export function buildConfig(overrides?: Partial<Config>): Config {
  const rawConfig = {
    chains: [
      {
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
        id: '31337',
        type: 'evm',
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
          withdrawalRemainder: {
            value: 0,
            unit: 'wei',
          },
        },
        providers: {
          ['EVM local']: {
            url: 'http://localhost:4111',
          },
        },
      },
    ],
    nodeSettings: settings.buildNodeSettings(),
    triggers: {
      rrp: [buildRrpTrigger()],
      http: [buildTrigger()],
      httpSignedData: [buildTrigger()],
    },
    templates: [],
    ois: [ois.buildOIS()],
    apiCredentials: [buildApiCredentials()],
    ...overrides,
  };

  // Validate the config to make sure it we are testing Airnode with valid configuration
  const parsedConfig = parseConfig(rawConfig);
  if (!parsedConfig.success) throw parsedConfig.error;

  return parsedConfig.data;
}
