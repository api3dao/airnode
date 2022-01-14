import { ApiCredentials, Config, Trigger } from '@api3/airnode-node';
import * as ois from './ois';
import * as settings from './node-settings';

export function buildTrigger(overrides?: Partial<Trigger>): Trigger {
  return {
    endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
    endpointName: 'convertToUSD',
    oisTitle: 'Currency Converter API',
    ...overrides,
  };
}

export function buildApiCredentials(overrides?: Partial<ApiCredentials>): ApiCredentials {
  return {
    securitySchemeName: 'My Security Scheme',
    securitySchemeValue: 'supersecret',
    oisTitle: 'Currency Converter API',
    ...overrides,
  };
}

export function buildConfig(overrides?: Partial<Config>): Config {
  return {
    chains: [
      {
        maxConcurrency: 100,
        authorizers: [],
        contracts: {
          AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
        },
        id: '31337',
        type: 'evm',
        // We set an invalid options value to keep us honest in the use of both txType cases in downstream tests.
        options: {} as any,
        providers: {
          ['EVM local']: {
            url: 'http://localhost:4111',
          },
        },
      },
    ],
    nodeSettings: settings.buildNodeSettings(),
    triggers: {
      rrp: [buildTrigger()],
      http: [buildTrigger()],
    },
    ois: [ois.buildOIS()],
    apiCredentials: [buildApiCredentials()],
    ...overrides,
  };
}
