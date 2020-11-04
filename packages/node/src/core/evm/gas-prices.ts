import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import { goTimeout } from '../utils/promise-utils';
import { GasPriceFeed } from './contracts';
import * as utils from './utils';
import * as logger from '../logger';
import { LogsData } from '../../types';

interface FetchOptions {
  address: string;
  provider: ethers.providers.JsonRpcProvider;
}

type GasPriceResponse = ethers.BigNumber | null;

// We don't want to hold everything up so limit each request to 5 seconds maximum
const TIMEOUT = 5_000;
const FALLBACK_WEI_PRICE = ethers.utils.parseUnits('40', 'gwei');
const MAXIMUM_WEI_PRICE = ethers.utils.parseUnits('1000', 'gwei');

function getSources(options: FetchOptions): Promise<LogsData<GasPriceResponse>>[] {
  // The GasPriceFeed contract is not available in certain networks
  if (options.address === ethers.constants.AddressZero) {
    return [getEthNodeGasPrice(options)];
  }
  return [getEthNodeGasPrice(options), getDataFeedGasPrice(options)];
}

async function getDataFeedGasPrice(fetchOptions: FetchOptions): Promise<LogsData<GasPriceResponse>> {
  const { address, provider } = fetchOptions;
  const contract = new ethers.Contract(address, GasPriceFeed.ABI, provider);
  const [err, weiPrice] = await goTimeout(TIMEOUT, contract.latestAnswer() as Promise<ethers.BigNumber>);
  if (err || !weiPrice) {
    const log = logger.pend('ERROR', 'Failed to get gas price from gas price feed contract', err);
    return [[log], null];
  }
  return [[], weiPrice];
}

async function getEthNodeGasPrice(fetchOptions: FetchOptions): Promise<LogsData<GasPriceResponse>> {
  const { provider } = fetchOptions;
  const [err, weiPrice] = await goTimeout(TIMEOUT, provider.getGasPrice());
  if (err || !weiPrice) {
    const log = logger.pend('ERROR', 'Failed to get gas price from Ethereum node', err);
    return [[log], null];
  }
  return [[], weiPrice];
}

export async function getGasPrice(options: FetchOptions): Promise<LogsData<ethers.BigNumber>> {
  const gasPriceRequests = getSources(options);

  const requests = await Promise.all(gasPriceRequests);
  const fetchLogs = flatMap(requests, (r) => r[0]);
  const gasPrices = flatMap(requests, (r) => r[1]);
  const successfulPrices = gasPrices.filter((gp) => !!gp) as ethers.BigNumber[];

  // Fall back to FALLBACK_WEI_PRICE if no successful response is received
  if (isEmpty(successfulPrices)) {
    const fallbackGweiPrice = utils.weiToGwei(FALLBACK_WEI_PRICE);
    const message = `Failed to get gas prices from any sources. Falling back to default price ${fallbackGweiPrice} Gwei`;
    const errorLog = logger.pend('ERROR', message);
    return [[...fetchLogs, errorLog], FALLBACK_WEI_PRICE];
  }

  // We want to use the highest gas prices from the sources that returned a successful response.
  const highestWeiPrice = utils.sortBigNumbers(successfulPrices)[0];

  // We need to limit the gas price in case any one of the sources returns an unexpectedly
  // high gas price.
  const finalWeiPrice = highestWeiPrice.gt(MAXIMUM_WEI_PRICE) ? MAXIMUM_WEI_PRICE : highestWeiPrice;

  return [fetchLogs, finalWeiPrice];
}
