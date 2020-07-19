import { ethers } from 'ethers';
import * as ethereum from '../ethereum';
import { ProviderConfig, ProviderState } from '../../types';
import { go } from '../utils/promise-utils';
import * as logger from '../utils/logger';

export async function initializeState(config: ProviderConfig, index: number): Promise<ProviderState> {
  const provider = new ethers.providers.JsonRpcProvider(config.url);

  // Get the current block numer upfront
  const [blockErr, currentBlock] = await go(provider.getBlockNumber());
  if (blockErr || !currentBlock) {
    // TODO: Provider calls should retry on failure (issue #11)
    logger.logProviderJSON(config.name, 'ERROR', 'Unable to get current block');
    throw new Error('Unable to get current block');
  }
  logger.logProviderJSON(config.name, 'INFO', `Current block set to: ${currentBlock}`);

  return {
    config,
    currentBlock,
    index,
    provider,
    requests: {
      apiCalls: [],
      walletAuthorizations: [],
      withdrawals: [],
    },
    // This is fetched and set as late as possible for freshness
    gasPrice: null,
  };
}

export async function setGasPrice(state: ProviderState): Promise<ProviderState> {
  const { config } = state;

  // We will always get a gas price here
  const gasPrice = await ethereum.getGasPrice(state);

  logger.logProviderJSON(config.name, 'INFO', `Gas price set to ${ethereum.weiToGwei(gasPrice)} Gwei`);

  return { ...state, gasPrice };
}
