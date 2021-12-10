import * as path from 'path';
import * as fs from 'fs';
import { parseConfig } from '../config';
import * as handlers from '../handlers';
import { ApiCallOptions } from '../handlers';
import * as logger from '../logger';
import * as state from '../providers/state';
import { AggregatedApiCall, EVMProviderState, LogOptions, ProviderState, WorkerResponse } from '../types';
import { go } from '../utils/promise-utils';

export interface ProviderArgs {
  readonly state: ProviderState<EVMProviderState>;
}

export interface CallApiArgs {
  readonly aggregatedApiCall: AggregatedApiCall;
  readonly logOptions: LogOptions;
  readonly apiCallOptions: ApiCallOptions;
}

function loadConfig() {
  return parseConfig(path.resolve(`${__dirname}/../../config/config.json`), process.env);
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

export async function callApi({ aggregatedApiCall, logOptions, apiCallOptions }: CallApiArgs): Promise<WorkerResponse> {
  const config = loadConfig();
  const [logs, response] = await handlers.callApi({ config, aggregatedApiCall, apiCallOptions });
  logger.logPending(logs, logOptions);
  return { ok: true, data: response };
}

export const logMe = (obj: any) => {
  const logger = fs.createWriteStream('/tmp/log.txt', {
    flags: 'a', // 'a' means appending (old data will be preserved)
  });
  logger.write(JSON.stringify(obj, null, 2));
  logger.write('\n');
  logger.close();
};

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

export async function testApi(endpointId: string, parameters: any) {
  const config = loadConfig();
  const [err, result] = await handlers.testApi(config, endpointId, parameters);
  if (err) {
    throw err;
  }

  return result;
}
