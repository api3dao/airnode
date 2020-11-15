import rawConfig from '../../config.json';
import * as node from '@airnode/node';

const config = node.config.parseConfig(rawConfig);

export async function startCoordinator() {
  await node.handlers.startCoordinator(config);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Coordinator completed' }),
  };
}

export async function initializeProvider(event: any) {
  // State and config are sent separately
  const stateWithConfig = node.providerState.update(event.parameters.state, config);

  const [err, initializedState] = await node.promiseUtils.go(node.handlers.initializeProvider(stateWithConfig));
  if (err || !initializedState) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err,
        message: `Failed to initialize provider: ${stateWithConfig.settings.name}`,
      }),
    };
  }

  const scrubbedState = node.providerState.scrub(initializedState);
  return { statusCode: 200, body: JSON.stringify(scrubbedState) };
}

export async function callApi(event: any) {
  const { aggregatedApiCall, logOptions } = event.parameters;
  const [logs, response] = await node.handlers.callApi(config, aggregatedApiCall);
  node.logger.logPending(logs, logOptions);
  return { statusCode: 200, body: JSON.stringify(response) };
}

export async function processProviderRequests(event: any) {
  // State and config are sent separately
  const stateWithConfig = node.providerState.update(event.parameters.state, { config });

  const [err, updatedState] = await node.promiseUtils.go(node.handlers.processTransactions(stateWithConfig));
  if (err || !updatedState) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err,
        message: `Failed to process provider requests: ${stateWithConfig.settings.name}`,
      }),
    };
  }

  const scrubbedState = node.providerState.scrub(updatedState);
  return { statusCode: 200, body: JSON.stringify(scrubbedState) };
}
