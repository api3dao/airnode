import { ethers } from 'ethers';
import { initializeProvider } from './ethereum';

export interface State {
  readonly currentBlock: number | null;
  readonly gasPrice: ethers.BigNumber | null;
  readonly provider: ethers.providers.Provider;
}

export function initialize(): State {
  const provider = initializeProvider();

  return {
    currentBlock: null,
    gasPrice: null,
    provider,
  };
}

export function update(state: State, newState: any): State {
  return { ...state, ...newState };
}
