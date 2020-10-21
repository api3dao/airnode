import * as evm from '../evm';
import * as workers from '../workers';
import { EVMProviderState, ProviderState } from '../../types';

export async function spawnNewProvider(
  state: ProviderState<EVMProviderState>
): Promise<ProviderState<EVMProviderState>> {
  // TODO: This will probably need to change for other cloud providers
  const parameters = { state };
  const payload = workers.isLocalEnv() ? { parameters } : parameters;
  const options = { functionName: 'initializeProvider', payload };

  // If this throws, it will be caught by the calling function
  const updatedState = await workers.spawn(options);

  // The serverless function does not return an instance of an Ethereum
  // provider, so we create a new one before returning the state
  const evmProvider = evm.newProvider(updatedState.settings.url, updatedState.settings.chainId);

  return { ...updatedState, provider: evmProvider };
}

export async function spawnProviderRequestProcessor(
  state: ProviderState<EVMProviderState>
): Promise<ProviderState<EVMProviderState>> {
  // TODO: This will probably need to change for other cloud providers
  const parameters = { state };
  const payload = workers.isLocalEnv() ? { parameters } : parameters;
  const options = { functionName: 'processProviderRequests', payload };

  // If this throws, it will be caught by the calling function
  const updatedState = (await workers.spawn(options)) as ProviderState<EVMProviderState>;

  // The serverless function does not return an instance of an Ethereum
  // provider, so we create a new one before returning the state
  const evmProvider = evm.newProvider(updatedState.settings.url, updatedState.settings.chainId);

  return { ...updatedState, provider: evmProvider };
}
