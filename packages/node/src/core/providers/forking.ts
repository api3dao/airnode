import { ProviderState } from '../../types';
import * as ethereum from '../ethereum';
import * as forking from '../forking';

type CleanProviderState = Omit<ProviderState, 'provider'>

export async function spawn(index: number): Promise<ProviderState> {
  const payload = forking.isLocal() ? { pathParameters: { index } } : { index };

  const parameters = { functionName: 'initializeProvider', payload };

  // If this throws, it will be caught by the calling function
  const initialState = await forking.spawn(parameters) as CleanProviderState;

  // The serverless function does not return an instance
  // of an Ethereum provider, so we create a new one
  // before returning the state
  const provider = ethereum.newProvider(initialState.config.url);

  return { ...initialState, provider };
}
