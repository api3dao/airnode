import * as path from 'path';
import { logger, go } from '@api3/airnode-utilities';
import { loadTrustedConfig } from '../config';
import * as handlers from '../handlers';
import * as state from '../providers/state';
import { WorkerResponse, InitializeProviderPayload, CallApiPayload, ProcessTransactionsPayload } from '../types';

function loadConfig() {
  return loadTrustedConfig(path.resolve(`${__dirname}/../../config/config.json`), process.env);
}

export async function startCoordinator(): Promise<WorkerResponse> {
  const config = loadConfig();
  await handlers.startCoordinator(config);
  return { ok: true, data: { message: 'Coordinator completed' } };
}

export async function initializeProvider({ state: providerState }: InitializeProviderPayload): Promise<WorkerResponse> {
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

export async function callApi({ aggregatedApiCall, logOptions }: CallApiPayload): Promise<WorkerResponse> {
  const config = loadConfig();
  const [logs, response] = await handlers.callApi({ config, aggregatedApiCall });
  logger.logPending(logs, logOptions);
  return { ok: true, data: response };
}

export async function processTransactions({
  state: providerState,
}: ProcessTransactionsPayload): Promise<WorkerResponse> {
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

export async function processHttpRequest(endpointId: string, parameters: any) {
  const config = loadConfig();
  const [err, result] = await handlers.processHttpRequest(config, endpointId, parameters);
  if (err) {
    throw err;
  }

  return result;
}

export async function processHttpSignedDataRequest(endpointId: string, encodedParameters: any) {
  const config = loadConfig();
  const [err, result] = await handlers.processHttpSignedDataRequest(config, endpointId, encodedParameters);
  if (err) {
    throw err;
  }

  return result;
}
