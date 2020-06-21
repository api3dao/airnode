import { ethers } from 'ethers';
import { go } from './utils/promise-utils';
import { initializeProvider } from './ethereum';

export interface State {
  readonly chainId: number;
  readonly gasPrice: ethers.BigNumber | null;
  readonly provider: ethers.providers.Provider;
}

export async function initialize(): Promise<State> {
  const provider = initializeProvider();

  // Do this upfront to reduce potential extra calls later on
  const [err, network] = await go(provider.getNetwork());
  if (err) {
    // TODO: not sure how exactly to handle errors here
    // It might be better to configure this upfront somehow.
    // We may also need to handle multiple providers/networks
    // in the future.
    throw new Error(`Unable to get network. ${err}`);
  }

  const { chainId } = network as ethers.providers.Network;

  return { provider, chainId, gasPrice: null };
}

export function update(state: State, newState: any): State {
  return { ...state, ...newState };
}
