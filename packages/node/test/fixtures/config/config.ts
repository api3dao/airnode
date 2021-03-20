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
    id: 'test-config',
    triggers: {
      request: [buildTrigger()],
    },
    ois: [ois.buildOIS()],
    nodeSettings: settings.buildNodeSettings(),
    ...overrides,
  };
}
