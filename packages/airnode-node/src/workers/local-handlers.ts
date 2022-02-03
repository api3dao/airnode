import * as path from 'path';
import { parseConfig } from '../config';
import * as handlers from '../handlers';
import * as logger from '../logger';
import * as state from '../providers/state';
import { WorkerResponse, InitializeProviderPayload, CallApiPayload, ProcessTransactionsPayload } from '../types';
import { go } from '../utils/promise-utils';

function loadConfig() {
  const { config, shouldSkipValidation, validationOutput } = parseConfig(
    path.resolve(`${__dirname}/../../config/config.json`),
    process.env,
    true
  );

  // TODO: Log debug that validation is skipped
  if (shouldSkipValidation) return config;
  if (!validationOutput.valid) {
    throw new Error(`Invalid Airnode configuration file: ${JSON.stringify(validationOutput.messages, null, 2)}`);
  }
  // TODO: Log validation warnings - currently not possible since we have troubles constructing logger options

  return config;
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

export async function testApi(endpointId: string, parameters: any) {
  const config = loadConfig();
  const [err, result] = await handlers.testApi(config, endpointId, parameters);
  if (err) {
    throw err;
  }

  return result;
}
