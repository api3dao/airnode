import { getLogOptions, logger } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import * as providerState from '../providers/state';
import * as workers from '../workers';
import {
  EVMProviderState,
  EVMProviderSponsorState,
  LogsData,
  ProviderState,
  InitializeProviderPayload,
  ProcessTransactionsPayload,
  WorkerOptions,
} from '../types';

async function spawn<T extends EVMProviderState>(
  state: ProviderState<T>,
  workerOpts: WorkerOptions,
  functionName: InitializeProviderPayload['functionName'] | ProcessTransactionsPayload['functionName'],
  errorMessage: string
): Promise<LogsData<ProviderState<T> | null>> {
  const options = {
    ...workerOpts,
    payload: {
      state,
      functionName,
      logOptions: getLogOptions(),
    } as InitializeProviderPayload | ProcessTransactionsPayload,
  };

  const goRes = await go(() => workers.spawn(options));
  if (!goRes.success) {
    const log = logger.pend('ERROR', `${errorMessage}: ${state.settings.name}`, goRes.error);
    return [[log], null];
  }
  if (!goRes.data) {
    const log = logger.pend('ERROR', `${errorMessage}: ${state.settings.name}`);
    return [[log], null];
  }

  const res = goRes.data;

  if (!res.ok) {
    if (res.errorLog) {
      return [[res.errorLog], null];
    }
    const log = logger.pend('ERROR', `${errorMessage}: ${state.settings.name}`);
    return [[log], null];
  }

  const refreshedState = providerState.refresh({ ...res.data, config: state.config });
  return [[], refreshedState];
}

export function spawnNewProvider(
  state: ProviderState<EVMProviderState>,
  workerOpts: WorkerOptions
): Promise<LogsData<ProviderState<EVMProviderState> | null>> {
  return spawn(state, workerOpts, 'initializeProvider', 'Unable to initialize provider');
}

export function spawnProviderRequestProcessor(
  state: ProviderState<EVMProviderSponsorState>,
  workerOpts: WorkerOptions
): Promise<LogsData<ProviderState<EVMProviderSponsorState> | null>> {
  return spawn(state, workerOpts, 'processTransactions', 'Unable to process provider requests');
}
