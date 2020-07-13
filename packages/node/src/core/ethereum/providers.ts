import { ethers } from 'ethers';
import * as gasPrices from './gas-prices';
import { ProviderConfig, ProviderState } from '../../types';
import { go } from '../utils/promise-utils';
import * as utils from './utils';

export async function initializeProviderState(config: ProviderConfig): Promise<ProviderState | null> {
  const provider = new ethers.providers.JsonRpcProvider(config.url);

  // Fetch data that won't change in later blocks now to reduce potential extra calls later on
  // =========================================================
  // STEP 1: Get the current network
  // =========================================================
  const [networkErr, network] = await go(provider.getNetwork());
  if (networkErr || !network) {
    // TODO: Provider calls should retry on failure (issue #11)
    utils.logProviderJSON(config.name, 'ERROR', 'Unable to get network');
    return null;
  }
  utils.logProviderJSON(config.name, 'INFO', `Network set to '${network.name}' (ID: ${network.chainId})`);

  // =========================================================
  // STEP 2: Get the current block
  // =========================================================
  const [blockErr, currentBlock] = await go(provider.getBlockNumber());
  if (blockErr || !currentBlock) {
    // TODO: Provider calls should retry on failure (issue #11)
    utils.logProviderJSON(config.name, 'ERROR', 'Unable to get current block');
    return null;
  }
  utils.logProviderJSON(config.name, 'INFO', `Current block set to: ${currentBlock}`);

  // =========================================================
  // STEP 3: Get the pending requests
  // =========================================================
  // const [requestsErr, pendingRequests] = await go(provider.getBlockNumber());
  // if (requestsErr || !pendingRequests) {
  //   // TODO: Provider calls should retry on failure (issue #11)
  //   utils.logProviderJSON(config.name, 'ERROR', 'Unable to fetch pending requests');
  //   return null;
  // }
  // utils.logProviderJSON(config.name, 'INFO', `Number of pending requests: ${pendingRequests.length}`);

  return {
    config,
    currentBlock,
    network,
    provider,
    requests: [],
    // Gas price is fetched and set as late as possible - just before transactions are made
    gasPrice: null
  };
}

export async function setGasPrice(state: ProviderState): Promise<ProviderState> {
  const { config } = state;

  // We will always get a gas price here
  const gasPrice = await gasPrices.getGasPrice(state);

  utils.logProviderJSON(config.name, 'INFO', `Gas price set to ${utils.weiToGwei(gasPrice)} Gwei`);

  return { ...state, gasPrice };
}
