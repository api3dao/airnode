import { Config } from '../../../src/types';
import * as ois from './ois';
import * as settings from './node-settings';

export function buildConfig(config?: Partial<Config>): Config {
  return {
    id: 'test-config',
    triggers: {
      request: [
        {
          endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
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
