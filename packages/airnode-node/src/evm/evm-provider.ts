import { ethers } from 'ethers';
import { networks } from '@api3/airnode-protocol';
import { EVM_PROVIDER_TIMEOUT } from '../constants';

export function buildEVMProvider(url: string, chainId: string) {
  // Ethers makes a call to get the network in the background if it is
  // not provided/undefined when initializing the provider. We keep
  // a list of "known" networks to stop these extra calls if possible.
  const network = networks[chainId] || null;

  // Ethers only let's us configure the timeout when creating a provider
  return new ethers.providers.StaticJsonRpcProvider({ url, timeout: EVM_PROVIDER_TIMEOUT }, network);
}
