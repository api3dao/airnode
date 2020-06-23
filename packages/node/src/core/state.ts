import { ethers } from 'ethers';
import * as logger from './utils/logger';
import { go } from './utils/promise-utils';
import { initializeProvider } from './ethereum';

export interface State {
  readonly chainId: number;
  readonly currentBlock: number | null;
  readonly gasPrice: ethers.BigNumber | null;
  readonly provider: ethers.providers.Provider;
}

export async function initialize(): Promise<State> {
  const provider = initializeProvider();

  // Do this upfront to reduce potential extra calls later on
  const [networkErr, network] = await go(provider.getNetwork());
  if (networkErr || !network) {
    // TODO: Provider calls should retry on failure (issue #11)
    throw new Error(`Unable to get network. ${networkErr}`);
  }
  logger.logJSON('INFO', `Network set to '${network.name}' (ID: ${network.chainId})`);

  return {
    chainId: network.chainId,
    currentBlock: null,
    gasPrice: null,
    provider,
  };
}

export function update(state: State, newState: any): State {
  return { ...state, ...newState };
}
