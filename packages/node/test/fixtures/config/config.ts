import * as ois from './ois';
import * as settings from './node-settings';
import { Config, RrpTrigger, ApiCredentials } from '../../../src/types';

export function buildRrpTrigger(overrides?: Partial<RrpTrigger>): RrpTrigger {
  return {
    endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
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
        airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
        authorizers: ['0x0000000000000000000000000000000000000000'],
        contracts: {
          AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
        },
        id: '31337',
        type: 'evm',
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
    },
    ois: [ois.buildOIS()],
    apiCredentials: [buildApiCredentials()],
    ...overrides,
  };
}
