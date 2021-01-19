import { NodeSettings } from '../../../src/types';

export function buildNodeSettings(settings?: Partial<NodeSettings>): NodeSettings {
  return {
    cloudProvider: 'local',
    logFormat: 'plain',
    nodeVersion: '1.0.0',
    region: 'us-east-1',
    stage: 'test',
    chains: [
      {
        providerAdminForRecordCreation: '0xproviderAdminForRecordCreation',
        contracts: {
          Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
          Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
        },
        id: 31337,
        type: 'evm',
        providers: [{ name: 'evm-local', url: 'http://127.0.0.1:8545/' }],
      },
    ],
    ...settings,
  };
}
