import { go } from '../utils/promise-utils';
import * as logger from '../logger';
import * as providerState from '../providers/state';
import * as workers from '../workers';
import { EVMProviderState, LogsData, ProviderState, WorkerOptions } from '../../types';

export async function spawnNewProvider(
  state: ProviderState<EVMProviderState>,
  workerOpts: WorkerOptions
): Promise<LogsData<ProviderState<EVMProviderState> | null>> {
  const options = {
    ...workerOpts,
    functionName: 'initializeProvider',
    payload: { state },
  };

  const [err, res] = await go(workers.spawn(options));
  if (err || !res) {
    const log = logger.pend('ERROR', `Unable to initialize provider:${state.settings.name}`, err);
    return [[log], null];
  }

  if (!res.ok) {
    if (res.errorLog) {
      return [[res.errorLog], null];
    }
    const log = logger.pend('ERROR', `Unable to initialize provider:${state.settings.name}`);
    return [[log], null];
  }

  const unscrubbedState = providerState.unscrub(res.data);
  return [[], unscrubbedState];
}

export async function spawnProviderRequestProcessor(
  state: ProviderState<EVMProviderState>,
  workerOpts: WorkerOptions
): Promise<LogsData<ProviderState<EVMProviderState> | null>> {
  const options = {
    ...workerOpts,
    functionName: 'processProviderRequests',
    payload: { state },
  };

  const [err, res] = await go(workers.spawn(options));
  if (err || !res) {
    const log = logger.pend('ERROR', `Failed to process provider requests: ${state.settings.name}`, err);
    return [[log], null];
  }

  if (!res.ok) {
    if (res.errorLog) {
      return [[res.errorLog], null];
    }
    const log = logger.pend('ERROR', `Failed to process provider requests: ${state.settings.name}`);
    return [[log], null];
  }

  const unscrubbedState = providerState.unscrub(res.data);
  return [[], unscrubbedState];
}
