import { ProviderState } from '../../types';
import * as ethereum from '../ethereum';
import * as workers from '../workers';

export type CleanProviderState = Omit<ProviderState, 'provider'>;

export async function spawnNewProvider(index: number): Promise<ProviderState> {
  // TODO: This will probably need to change for other cloud providers
  const payload = workers.isLocalEnv() ? { pathParameters: { index } } : { index };

  const options = { functionName: 'initializeProvider', payload };

  // If this throws, it will be caught by the calling function
  const initialState = (await workers.spawn(options)) as CleanProviderState;

  // The serverless function does not return an instance of an Ethereum
  // provider, so we create a new one before returning the state
  const provider = ethereum.newProvider(initialState.config.url, initialState.config.chainId);

  return { ...initialState, provider };
}

export async function spawnProviderRequestProcessor(state: ProviderState): Promise<boolean> {
  // TODO: This will probably need to change for other cloud providers
  // TODO: queryStringParameters is probably not right...
  const payload = workers.isLocalEnv() ? { queryStringParameters: { state } } : state;

  const options = { functionName: 'processProviderRequests', payload };

  // If this throws, it will be caught by the calling function
  const response = (await workers.spawn(options)) as boolean;

  return response;
}
