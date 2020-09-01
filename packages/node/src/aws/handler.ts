import { config } from '../core/config';
import * as coordinator from '../core/coordinator';
import * as providers from '../core/providers';
import * as apiCallExecution from '../core/api-caller/execution';
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
  const index = Number(event.pathParameters.index);
  const providerConfig = config.nodeSettings.ethereumProviders[index];
  const state = await providers.initializeState(providerConfig, index);

  if (!state) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Failed to initialize provider: ${providerConfig.name}` }),
    };
  }

  // We can't return the instance of the provider. A new provider
  // will be created in the calling function
  const body = removeKey(state, 'provider');

  return {
    statusCode: 200,
    body: JSON.stringify(body),
  };
}

export async function callApi(event: any) {
  const { aggregatedApiCall } = event.queryStringParameters;
  const response = await apiCallExecution.callApi(aggregatedApiCall);

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
}

export async function processProviderRequests(event: any) {
  const { state } = event.queryStringParameters;
  const response = await providers.processTransactions(state);

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
}
