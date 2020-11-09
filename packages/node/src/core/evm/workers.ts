import * as providerState from '../providers/state';
import * as workers from '../workers';
import { Config, EVMProviderState, ProviderState } from '../../types';

export async function spawnNewProvider(
  config: Config,
  state: ProviderState<EVMProviderState>
): Promise<ProviderState<EVMProviderState>> {
  const payload = { state };
  const options = { config, functionName: 'initializeProvider', payload };

  // If this throws, it will be caught by the calling function
  const responseState = await workers.spawn(options);
  const unscrubbedState = providerState.unscrubEVM(responseState);
  return unscrubbedState;
}

export async function spawnProviderRequestProcessor(
  config: Config,
  state: ProviderState<EVMProviderState>
): Promise<ProviderState<EVMProviderState>> {
  const payload = { state };
  const options = { config, functionName: 'processProviderRequests', payload };

  // If this throws, it will be caught by the calling function
  const responseState = (await workers.spawn(options)) as ProviderState<EVMProviderState>;
  const unscrubbedState = providerState.unscrubEVM(responseState);
  return unscrubbedState;
}
