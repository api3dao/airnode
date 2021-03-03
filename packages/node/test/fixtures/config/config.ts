import { Config } from '../../../src/types';
import * as ois from './ois';
import * as settings from './node-settings';

export function buildConfig(config?: Partial<Config>): Config {
  return {
    id: 'test-config',
    triggers: {
      request: [
        {
          endpointId: '0x3c8e59646e688707ddd3b1f07c4dbc5ab55a0257362a18569ac2644ccf6faddb',
          endpointName: 'convertToUSD',
          oisTitle: 'currency-converter-ois',
        },
      ],
    },
    ois: [ois.buildOIS()],
    nodeSettings: settings.buildNodeSettings(),
    ...config,
  };
}
