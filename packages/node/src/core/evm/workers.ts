import * as providerState from '../providers/state';
import * as workers from '../workers';
import { EVMProviderState, ProviderState, WorkerOptions } from '../../types';

export async function spawnNewProvider(
  state: ProviderState<EVMProviderState>,
  workerOpts: WorkerOptions
): Promise<ProviderState<EVMProviderState>> {
  const options = {
    ...workerOpts,
    functionName: 'initializeProvider',
    payload: { state },
  };

  // If this throws, it will be caught by the calling function
  const responseState = await workers.spawn(options);
  const unscrubbedState = providerState.unscrub(responseState);
  return unscrubbedState;
}

export async function spawnProviderRequestProcessor(
  state: ProviderState<EVMProviderState>,
  workerOpts: WorkerOptions
): Promise<ProviderState<EVMProviderState>> {
  const options = {
    ...workerOpts,
    functionName: 'processProviderRequests',
    payload: { state },
  };

  // If this throws, it will be caught by the calling function
  const responseState = (await workers.spawn(options)) as ProviderState<EVMProviderState>;
  const unscrubbedState = providerState.unscrub(responseState);
  return unscrubbedState;
}
