import { ChainConfig, ChainProvider, CoordindatorSettings } from '../../../src/types';
import { createEVMState } from '../../../src/core/providers/state';

export function createEVMProviderState() {
  const coordinatorId = '837daEf231';

  const chainProvider: ChainProvider = { name: 'ganache-test', url: 'http://localhost:4111' };

  const chainConfig: ChainConfig = {
    id: 1337,
    type: 'evm',
    providers: [chainProvider],
  };

  const coordinatorSettings: CoordindatorSettings = { logFormat: 'plain' };

  return createEVMState(coordinatorId, chainConfig, chainProvider, coordinatorSettings);
}
