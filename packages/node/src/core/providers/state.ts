import * as ethereum from '../ethereum';
import { ProviderConfig, ProviderState } from '../../types';
import * as logger from '../utils/logger';

export function create(config: ProviderConfig, index: number): ProviderState {
  return {
    config,
    currentBlock: null,
    index,
    provider: ethereum.newProvider(config.url, config.chainId),
    requests: {
      apiCalls: [],
      walletAuthorizations: [],
      withdrawals: [],
    },
    // This is fetched and set as late as possible for freshness
    gasPrice: null,
  };
}

export function update(state: ProviderState, newState: any): ProviderState {
  return { ...state, ...newState };
}

export async function setGasPrice(state: ProviderState): Promise<ProviderState> {
  const { config } = state;

  // We will always get a gas price here
  const gasPrice = await ethereum.getGasPrice(state);

  logger.logProviderJSON(config.name, 'INFO', `Gas price set to ${ethereum.weiToGwei(gasPrice)} Gwei`);

  return { ...state, gasPrice };
}
