import { ethers } from 'ethers';
import { NETWORKS } from './networks';
import { EVM_PROVIDER_TIMEOUT } from '../constants';

export function buildEVMProvider(url: string, chainId: number) {
  // Ethers makes a call to get the network in the background if it is
  // not provided/undefined when initializing the provider. We keep
  // a list of "known" networks to stop these extra calls if possible.
  const network = NETWORKS[chainId] || null;

  // Ethers only let's us configure the timeout when creating a provider
  return new ethers.providers.JsonRpcProvider({ url, timeout: EVM_PROVIDER_TIMEOUT }, network);
}
