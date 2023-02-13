import { NodeSettings } from '../../../src/config';
import { version as getPackageVersion } from '../../../src/version';

export function buildNodeSettings(settings?: Partial<NodeSettings>): NodeSettings {
  return {
    cloudProvider: {
      type: 'local',
      gatewayServerPort: 3000,
    },
    airnodeWalletMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
    httpGateway: {
      enabled: false,
    },
    httpSignedDataGateway: {
      enabled: false,
    },
    oevGateway: {
      enabled: false,
    },
    heartbeat: {
      enabled: true,
      apiKey: '3a7af83f-6450-46d3-9937-5f9773ce2849',
      url: 'https://example.com',
    },
    logFormat: 'plain',
    logLevel: 'DEBUG',
    nodeVersion: getPackageVersion(),
    stage: 'test',
    ...settings,
  };
}
