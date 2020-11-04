import { NodeSettings } from '../../src/types';

export function createNodeSettings(settings?: Partial<NodeSettings>): NodeSettings {
  return {
    cloudProvider: 'aws',
    logFormat: 'plain',
    nodeKey: 'node-key',
    platformKey: 'key-to-access-chainapi',
    platformUrl: 'https://chainapi.com/api',
    providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
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
