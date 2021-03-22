import { Config, RequestTrigger } from '../../../src/types';
import * as ois from './ois';
import * as settings from './node-settings';

export function buildTrigger(overrides?: Partial<RequestTrigger>): RequestTrigger {
  return {
    endpointId: '0x3c8e59646e688707ddd3b1f07c4dbc5ab55a0257362a18569ac2644ccf6faddb',
    endpointName: 'convertToUSD',
    oisTitle: 'currency-converter-ois',
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
        id: 31337,
        type: 'evm',
        providers: [{ name: 'evm-local', url: 'http://127.0.0.1:8545/' }],
      },
    ],
    id: 'test-config',
    nodeSettings: settings.buildNodeSettings(),
    triggers: {
      request: [buildTrigger()],
    },
    ois: [ois.buildOIS()],
    ...overrides,
  };
}
