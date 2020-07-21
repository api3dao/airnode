import { ProviderState } from '../../types';
import * as ethereum from '../ethereum';
import * as workers from '../workers';

export type CleanProviderState = Omit<ProviderState, 'provider'>;

export async function spawnNewProvider(index: number): Promise<ProviderState> {
  // This will probably need to change for other cloud providers
  const payload = workers.isLocalEnv() ? { pathParameters: { index } } : { index };

  const parameters = { functionName: 'initializeProvider', payload };

  // If this throws, it will be caught by the calling function
  const initialState = (await workers.spawn(parameters)) as CleanProviderState;

  // The serverless function does not return an instance
  // of an Ethereum provider, so we create a new one
  // before returning the state
  const provider = ethereum.newProvider(initialState.config.url);

  return { ...initialState, provider };
}
