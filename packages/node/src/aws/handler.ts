import * as config from '../core/config';
import * as handlers from '../core/handlers';
import * as logger from '../core/logger';
import * as state from '../core/providers/state';
import { go } from '../core/utils/promise-utils';
import { removeKey } from '../core/utils/object-utils';

export async function start(event: any) {
  await handlers.startCoordinator(config.parseConfig(event.parameters.config));

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Coordinator completed' }),
  };
}

export async function initializeProvider(event: any) {
  const { config } = event.parameters;
  // State and config are sent separately
  const stateWithConfig = state.update(event.parameters.state, { config });

  const [err, initializedState] = await go(handlers.initializeProvider(stateWithConfig));
  if (err || !initializedState) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err,
        message: `Failed to initialize provider: ${stateWithConfig.settings.name}`,
      }),
    };
  }

  // NOTE: We can't return the instance of the provider. A new provider
  // will be created in the calling function
  const stateWithoutProvider = removeKey(initializedState, 'provider');
  return { statusCode: 200, body: JSON.stringify(stateWithoutProvider) };
}

export async function callApi(event: any) {
  const { aggregatedApiCall, config, logOptions } = event.parameters;
  const [logs, response] = await handlers.callApi(config, aggregatedApiCall);
  logger.logPending(logs, logOptions);
  return { statusCode: 200, body: JSON.stringify(response) };
}

export async function processProviderRequests(event: any) {
  const { config } = event.parameters;
  // State and config are sent separately
  const stateWithConfig = state.update(event.parameters.state, { config });

  const [err, updatedState] = await go(handlers.processTransactions(stateWithConfig));
  if (err || !updatedState) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err,
        message: `Failed to process provider requests: ${stateWithConfig.settings.name}`,
      }),
    };
  }

  // NOTE: We can't return the instance of the provider. A new provider
  // will be created in the calling function
  const stateWithoutProvider = removeKey(updatedState, 'provider');
  return { statusCode: 200, body: JSON.stringify(stateWithoutProvider) };
}
