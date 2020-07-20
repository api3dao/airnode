import { ethers } from 'ethers';
import * as gasPrices from './gas-prices';
import { ProviderConfig, ProviderState } from '../../types';
import { go } from '../utils/promise-utils';
import * as utils from './utils';
import * as logger from '../utils/logger';

export async function initializeProviderState(config: ProviderConfig): Promise<ProviderState | null> {
  const provider = new ethers.providers.JsonRpcProvider(config.url);

  // =========================================================
  // STEP 1: Get the current block
  // =========================================================
  const [blockErr, currentBlock] = await go(provider.getBlockNumber());
  if (blockErr || !currentBlock) {
    // TODO: Provider calls should retry on failure (issue #11)
    logger.logProviderJSON(config.name, 'ERROR', 'Unable to get current block');
    return null;
  }
  logger.logProviderJSON(config.name, 'INFO', `Current block set to: ${currentBlock}`);

  return {
    config,
    currentBlock,
    provider,
    requests: { apiCalls: [] },
    // These are fetched and set as late as possible for freshness
    gasPrice: null,
    nonce: null,
  };
}

export async function setGasPrice(state: ProviderState): Promise<ProviderState> {
  const { config } = state;

  // We will always get a gas price here
  const gasPrice = await gasPrices.getGasPrice(state);

  logger.logProviderJSON(config.name, 'INFO', `Gas price set to ${utils.weiToGwei(gasPrice)} Gwei`);

  return { ...state, gasPrice };
}
