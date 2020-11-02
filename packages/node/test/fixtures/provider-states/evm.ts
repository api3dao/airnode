import { ChainConfig, ChainProvider } from '../../../src/types';
import { createEVMState } from '../../../src/core/providers/state';
import * as nodeSettings from '../node-settings';

export function createEVMProviderState() {
  const coordinatorId = '837daEf231';

  const chainProvider: ChainProvider = { name: 'ganache-test', url: 'http://localhost:4111' };

  const chainConfig: ChainConfig = {
    adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    id: 1337,
    type: 'evm',
    providers: [chainProvider],
  };

  const settings = nodeSettings.createNodeSettings({ chains: [chainConfig] });

  return createEVMState(coordinatorId, chainConfig, chainProvider, settings);
}
