import { Config } from '../../../src/types';
import * as ois from './ois';
import * as settings from './node-settings';

export function buildConfig(config?: Partial<Config>): Config {
  return {
    id: 'my-config',
    triggers: {
      requests: [{ endpointId: 'endpointId', endpointName: 'endpointName', oisTitle: 'oisTitle' }],
    },
    ois: [ois.buildOIS()],
    nodeSettings: settings.buildNodeSettings(),
    ...config,
  };
}
