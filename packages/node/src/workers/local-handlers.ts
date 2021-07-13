import fs from 'fs';
import { parseConfig } from '../config';
import * as handlers from '../handlers';
import * as logger from '../logger';
import * as state from '../providers/state';
import { go } from '../utils/promise-utils';
import { AggregatedApiCall, EVMProviderState, LogOptions, ProviderState, WorkerResponse } from '../types';

export interface ProviderArgs {
  readonly state: ProviderState<EVMProviderState>;
}

export interface CallApiArgs {
  readonly aggregatedApiCall: AggregatedApiCall;
  readonly logOptions: LogOptions;
}

function loadConfig() {
  const rawConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'))[0];
  return parseConfig(rawConfig);
}

export async function startCoordinator(): Promise<WorkerResponse> {
  const config = loadConfig();
  await handlers.startCoordinator(config);
  return { ok: true, data: { message: 'Coordinator completed' } };
}

export async function initializeProvider({ state: providerState }: ProviderArgs): Promise<WorkerResponse> {
  const config = loadConfig();
  const stateWithConfig = state.update(providerState, { config });

  const [err, initializedState] = await go(() => handlers.initializeProvider(stateWithConfig));
  if (err || !initializedState) {
    const msg = `Failed to initialize provider:${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, err);
    return { ok: false, errorLog };
  }

  const scrubbedState = state.scrub(initializedState);
  return { ok: true, data: scrubbedState };
}

export async function callApi({ aggregatedApiCall, logOptions }: CallApiArgs): Promise<WorkerResponse> {
  const config = loadConfig();
  const [logs, response] = await handlers.callApi(config, aggregatedApiCall);
  logger.logPending(logs, logOptions);
  return { ok: true, data: response };
}

export async function processProviderRequests({ state: providerState }: ProviderArgs): Promise<WorkerResponse> {
  const config = loadConfig();
  const stateWithConfig = state.update(providerState, { config });

  const [err, updatedState] = await go(() => handlers.processTransactions(stateWithConfig));
  if (err || !updatedState) {
    const msg = `Failed to process provider requests:${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, err);
    return { ok: false, errorLog };
  }

  const scrubbedState = state.scrub(updatedState);
  return { ok: true, data: scrubbedState };
}
