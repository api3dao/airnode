import * as evm from '../evm';
import * as workers from '../workers';
import { ChainConfig, ChainProvider, EVMProviderState, ProviderState } from '../../types';

export type CleanProviderState = Omit<ProviderState<EVMProviderState>, 'provider'>;

export async function spawnNewProvider(coordinatorId: string, chain: ChainConfig, provider: ChainProvider): Promise<ProviderState<EVMProviderState>> {
  // TODO: This will probably need to change for other cloud providers
  const parameters = { chain, coordinatorId, provider };
  const payload = workers.isLocalEnv() ? { parameters } : parameters;
  const options = { functionName: 'initializeProvider', payload };

  // If this throws, it will be caught by the calling function
  const newState = (await workers.spawn(options)) as CleanProviderState;

  // The serverless function does not return an instance of an Ethereum
  // provider, so we create a new one before returning the state
  const evmProvider = evm.newProvider(newState.settings.url, newState.settings.chainId);

  return { ...newState, provider: evmProvider };
}

export async function spawnProviderRequestProcessor(state: ProviderState<EVMProviderState>): Promise<ProviderState<EVMProviderState>> {
  // TODO: This will probably need to change for other cloud providers
  const parameters = { state };
  const payload = workers.isLocalEnv() ? { parameters } : parameters;
  const options = { functionName: 'processProviderRequests', payload };

  // If this throws, it will be caught by the calling function
  const updatedState = (await workers.spawn(options)) as CleanProviderState;

  // The serverless function does not return an instance of an Ethereum
  // provider, so we create a new one before returning the state
  const evmProvider = evm.newProvider(updatedState.settings.url, updatedState.settings.chainId);

  return { ...updatedState, provider: evmProvider };
}
