import { NodeSettings } from '../../../src/types';

export function buildNodeSettings(settings?: Partial<NodeSettings>): NodeSettings {
  return {
    cloudProvider: 'local:aws',
    logFormat: 'plain',
    nodeVersion: '1.0.0',
    region: 'us-east-1',
    stage: 'test',
    chains: [
      {
        adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
        id: 1337,
        type: 'evm',
        providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
      },
    ],
    ...settings,
  };
}
