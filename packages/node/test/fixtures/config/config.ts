import * as ois from './ois';
import * as settings from './node-settings';
import { Config, RequestTrigger } from '../../../src/types';

export function buildTrigger(overrides?: Partial<RequestTrigger>): RequestTrigger {
  return {
    endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
    endpointName: 'convertToUSD',
    oisTitle: 'Currency Converter API',
    ...overrides,
  };
}

export function buildConfig(overrides?: Partial<Config>): Config {
  const oisTitle = 'Currency Converter API';
  const securitySchemeName = 'My Security Scheme';
  const securitySchemeEnvName = 'SS_CURRENCY_CONVERTER_API_MY_SECURITY_SCHEME';
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
    environment: {
      securitySchemes: [
        {
          oisTitle: oisTitle,
          name: securitySchemeName,
          envName: securitySchemeEnvName,
        },
      ],
    },
    nodeSettings: settings.buildNodeSettings(),
    triggers: {
      request: [buildTrigger()],
    },
    ois: [ois.buildOIS()],
    ...overrides,
  };
}
