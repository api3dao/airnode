import { Config } from '../../../src/types';
import * as ois from './ois';
import * as settings from './node-settings';

export function buildConfig(config?: Partial<Config>): Config {
  return {
    id: 'test-config',
    triggers: {
      requests: [
        {
          endpointId: '0x8b4b3591c5b12c65a837459ada36116f755c9a156df205eba211c5789fc48da6',
          endpointName: 'convertToUSD',
          oisTitle: 'test-ois',
        },
      ],
    },
    ois: [ois.buildOIS()],
    nodeSettings: settings.buildNodeSettings(),
    ...config,
  };
}
