import { ethers } from 'ethers';
import isEmpty from 'lodash/isEmpty';
import { go } from '../utils/promise-utils';
import { GasPriceFeed } from './contracts';
import * as logger from '../utils/logger';
import * as ethereum from './';
import { State } from '../state';

// We don't want to hold everything up so limit each request to 5 seconds maximum
const FALLBACK_WEI_PRICE = ethers.utils.parseUnits('40', 'gwei');
const MAXIMUM_WEI_PRICE = ethers.utils.parseUnits('1000', 'gwei');

type GasPriceResponse = ethers.BigNumber | null;

async function getDataFeedGasPrice(state: State): Promise<GasPriceResponse> {
  const contract = new ethers.Contract(GasPriceFeed.addresses[state.chainId], GasPriceFeed.ABI, state.provider);
  const [err, weiPrice] = await go(contract.latestAnswer() as Promise<string>);
  if (err || !weiPrice) {
    logger.logJSON('ERROR', `Failed to get gas price from gas price feed contract. Reason: ${err}`);
    return null;
  }
  return ethereum.weiToBigNumber(weiPrice);
}

async function getEthNodeGasPrice(state: State): Promise<GasPriceResponse> {
  const [err, weiPrice] = await go(state.provider.getGasPrice());
  if (err || !weiPrice) {
    logger.logJSON('ERROR', `Failed to get gas price from Ethereum node. Reason: ${err}`);
    return null;
  }
  return weiPrice;
}

export async function getGasPrice(state: State): Promise<ethers.BigNumber> {
  const gasPriceRequests = [
    getEthNodeGasPrice(state),
    getDataFeedGasPrice(state),
  ];
  const gasPrices = await Promise.all(gasPriceRequests);
  const successfulPrices = gasPrices.filter((gp) => !!gp) as ethers.BigNumber[];

  // Fall back to FALLBACK_WEI_PRICE if no successful response is received
  if (isEmpty(successfulPrices)) {
    const fallbackGweiPrice = ethereum.weiToGwei(FALLBACK_WEI_PRICE);
    const message = `Failed to get gas prices from any sources. Falling back to default price ${fallbackGweiPrice} Gwei`;
    logger.logJSON('ERROR', message);
    return FALLBACK_WEI_PRICE;
  }

  // We want to use the highest gas prices from the sources that returned a successful response.
  const highestWeiPrice = ethereum.sortBigNumbers(successfulPrices)[0];

  // We need to limit the gas price in case any one of the sources returns an unexpectedly
  // high gas price.
  const finalWeiPrice = highestWeiPrice.gt(MAXIMUM_WEI_PRICE) ? MAXIMUM_WEI_PRICE : highestWeiPrice;

  return finalWeiPrice;
}
