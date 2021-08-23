import { NodeSettings } from '../../../src/types';

export function buildNodeSettings(settings?: Partial<NodeSettings>): NodeSettings {
  return {
    cloudProvider: 'local',
    airnodeWalletMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
    enableHeartbeat: true,
    logFormat: 'plain',
    logLevel: 'DEBUG',
    nodeVersion: '1.0.0',
    region: 'us-east-1',
    stage: 'test',
    ...settings,
  };
}
