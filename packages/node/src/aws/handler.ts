import { config } from '../core/config';
import * as handlers from '../core/handlers';
import * as logger from '../core/logger';
import { removeKey } from '../core/utils/object-utils';

export async function start(_event: any) {
  await handlers.startCoordinator(config.nodeSettings);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Coordinator completed' }),
  };
}

export async function initializeProvider(event: any) {
  const { state } = event.parameters;
  // TODO: Wrap this in a 'go' to catch and log any unexpected errors
  const initializedState = await handlers.initializeProvider(state);
  if (!initializedState) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Failed to initialize provider: ${state.settings.name}` }),
    };
  }

  // NOTE: We can't return the instance of the provider. A new provider
  // will be created in the calling function
  const body = removeKey(initializedState, 'provider');
  return { statusCode: 200, body: JSON.stringify(body) };
}

export async function callApi(event: any) {
  const { aggregatedApiCall, logOptions } = event.parameters;
  const [logs, response] = await handlers.callApi(aggregatedApiCall);
  logger.logPending(logs, logOptions);
  return { statusCode: 200, body: JSON.stringify(response) };
}

export async function processProviderRequests(event: any) {
  const { state } = event.parameters;
  const updatedState = await handlers.processTransactions(state);
  const body = removeKey(updatedState, 'provider');
  return { statusCode: 200, body: JSON.stringify(body) };
}
