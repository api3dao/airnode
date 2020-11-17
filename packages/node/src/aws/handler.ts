import * as config from '../core/config';
import * as handlers from '../core/handlers';
import * as logger from '../core/logger';
import * as state from '../core/providers/state';
import { go } from '../core/utils/promise-utils';
import { WorkerResponse } from '../types';

function encodeBody(data: WorkerResponse): string {
  return JSON.stringify(data);
}

export async function startCoordinator(event: any) {
  await handlers.startCoordinator(config.parseConfig(event.parameters.config));
  const response = { ok: true, data: { message: 'Coordinator completed' } };
  return { statusCode: 200, body: encodeBody(response) };
}

export async function initializeProvider(event: any) {
  const { config } = event.parameters;
  // State and config are sent separately
  const stateWithConfig = state.update(event.parameters.state, { config });

  const [err, initializedState] = await go(handlers.initializeProvider(stateWithConfig));
  if (err || !initializedState) {
    const msg = `Failed to initialize provider: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, err);
    const body = encodeBody({ ok: false, errorLog });
    return { statusCode: 500, body };
  }

  const body = encodeBody({ ok: true, data: state.scrub(initializedState) });
  return { statusCode: 200, body };
}

export async function callApi(event: any) {
  const { aggregatedApiCall, config, logOptions } = event.parameters;
  const [logs, apiCallResponse] = await handlers.callApi(config, aggregatedApiCall);
  logger.logPending(logs, logOptions);
  const response = encodeBody({ ok: true, data: apiCallResponse });
  return { statusCode: 200, body: JSON.stringify(response) };
}

export async function processProviderRequests(event: any) {
  const { config } = event.parameters;
  // State and config are sent separately
  const stateWithConfig = state.update(event.parameters.state, { config });

  const [err, updatedState] = await go(handlers.processTransactions(stateWithConfig));
  if (err || !updatedState) {
    const msg = `Failed to process provider requests: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, err);
    const body = encodeBody({ ok: false, errorLog });
    return { statusCode: 500, body };
  }

  const body = encodeBody({ ok: true, data: state.scrub(updatedState) });
  return { statusCode: 200, body };
}
