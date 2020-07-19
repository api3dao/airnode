import { config } from '../core/config';
import * as coordinator from '../core/coordinator';
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
  const index = Number(event.pathParameters.index);
  const providerConfig = config.nodeSettings.ethereumProviders[index];
  const state = await providers.initializeState(providerConfig, index);

  const body = removeKey(state, 'provider');

  return {
    statusCode: 200,
    body: JSON.stringify(body),
  };
}
