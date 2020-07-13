import { ethers } from 'ethers';
import isEmpty from 'lodash/isEmpty';
import { ProviderState } from '../../types';
import { goTimeout } from '../utils/promise-utils';
import { GasPriceFeed } from './contracts';
import * as utils from './utils';

// We don't want to hold everything up so limit each request to 5 seconds maximum
const TIMEOUT = 5_000;
const FALLBACK_WEI_PRICE = ethers.utils.parseUnits('40', 'gwei');
const MAXIMUM_WEI_PRICE = ethers.utils.parseUnits('1000', 'gwei');

type GasPriceResponse = ethers.BigNumber | null;

async function getDataFeedGasPrice(providerState: ProviderState): Promise<GasPriceResponse> {
  const { config, network, provider } = providerState;
  const contract = new ethers.Contract(GasPriceFeed.addresses[network.chainId], GasPriceFeed.ABI, provider);
  const [err, weiPrice] = await goTimeout(TIMEOUT, contract.latestAnswer() as Promise<string>);
  if (err || !weiPrice) {
    utils.logProviderJSON(config.name, 'ERROR', `Failed to get gas price from gas price feed contract. Reason: ${err}`);
    return null;
  }
  return utils.weiToBigNumber(weiPrice);
}

async function getEthNodeGasPrice(state: ProviderState): Promise<GasPriceResponse> {
  const { config, provider } = state;
  const [err, weiPrice] = await goTimeout(TIMEOUT, provider.getGasPrice());
  if (err || !weiPrice) {
    utils.logProviderJSON(config.name, 'ERROR', `Failed to get gas price from Ethereum node. Reason: ${err}`);
    return null;
  }
  return weiPrice;
}

export async function getGasPrice(providerState: ProviderState): Promise<ethers.BigNumber> {
  const gasPriceRequests = [getEthNodeGasPrice(providerState), getDataFeedGasPrice(providerState)];
  const gasPrices = await Promise.all(gasPriceRequests);
  const successfulPrices = gasPrices.filter((gp) => !!gp) as ethers.BigNumber[];

  // Fall back to FALLBACK_WEI_PRICE if no successful response is received
  if (isEmpty(successfulPrices)) {
    const fallbackGweiPrice = utils.weiToGwei(FALLBACK_WEI_PRICE);
    const message = `Failed to get gas prices from any sources. Falling back to default price ${fallbackGweiPrice} Gwei`;
    utils.logProviderJSON(providerState.config.name, 'ERROR', message);
    return FALLBACK_WEI_PRICE;
  }

  // We want to use the highest gas prices from the sources that returned a successful response.
  const highestWeiPrice = utils.sortBigNumbers(successfulPrices)[0];

  // We need to limit the gas price in case any one of the sources returns an unexpectedly
  // high gas price.
  const finalWeiPrice = highestWeiPrice.gt(MAXIMUM_WEI_PRICE) ? MAXIMUM_WEI_PRICE : highestWeiPrice;

  return finalWeiPrice;
}
