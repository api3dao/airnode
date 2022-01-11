import { NodeSettings } from '@api3/airnode-node/src/types';

export function buildNodeSettings(settings?: Partial<NodeSettings>): NodeSettings {
  return {
    cloudProvider: {
      type: 'local',
    },
    airnodeWalletMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
    httpGateway: {
      enabled: false,
    },
    heartbeat: {
      enabled: true,
      apiKey: '3a7af83f-6450-46d3-9937-5f9773ce2849',
      id: '2d14a39a-9f6f-41af-9905-99abf0e5e1f0',
      url: 'https://example.com',
    },
    logFormat: 'plain',
    logLevel: 'DEBUG',
    nodeVersion: '1.0.0',
    stage: 'test',
    ...settings,
  };
}
