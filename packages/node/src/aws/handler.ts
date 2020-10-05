import * as coordinator from '../core/coordinator';
import * as http from '../core/adapters/http/execution';
import * as logger from '../core/logger';
import * as providers from '../core/providers';
import { removeKey } from '../core/utils/object-utils';

export async function start(event: any) {
  await coordinator.start();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };
}

export async function initializeProvider(event: any) {
  const { state } = event.parameters;
  const initializedState = await providers.initializeState(state);

  if (!initializedState) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Failed to initialize provider: ${state.settings.name}` }),
    };
  }

  // NOTE: We can't return the instance of the provider. A new provider
  // will be created in the calling function
  const body = removeKey(initializedState, 'provider');

  return {
    statusCode: 200,
    body: JSON.stringify(body),
  };
}

export async function callApi(event: any) {
  const { aggregatedApiCall, logOptions } = event.parameters;
  const [logs, response] = await http.callApi(aggregatedApiCall);
  logger.logPending(logs, logOptions);

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
}

export async function processProviderRequests(event: any) {
  const { state } = event.parameters;
  const response = await providers.processTransactions(state);

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
}
