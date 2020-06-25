import { ethers } from 'ethers';
import isEmpty from 'lodash/isEmpty';
import isFinite from 'lodash/isFinite';
import { get } from '../clients/http';
import { go } from '../utils/promise-utils';
import { GasPriceFeed } from './contracts';
import * as logger from '../utils/logger';
import * as ethereum from './';
import { State } from '../state';

// We don't want to hold everything up so limit each request to 5 seconds maximum
const TIMEOUT = 5_000;
const FALLBACK_WEI_PRICE = ethers.utils.parseUnits('40', 'gwei');
const MAXIMUM_WEI_PRICE = ethers.utils.parseUnits('1000', 'gwei');

type ResponseUnit = 'gwei';

interface GasPriceHttpFeed {
  responseUnit: ResponseUnit;
  parseResponse: (res: any) => string | null;
  url: string;
}

// TODO: These should be configurable (possibly by an onchain event?).
// If one API provider is down or is no longer serving free gas prices,
// we don't want to spam the logs every run.
const GAS_PRICE_HTTP_FEEDS: GasPriceHttpFeed[] = [
  {
    parseResponse: (data: any) => data.fast || null,
    responseUnit: 'gwei',
    url: 'https://www.etherchain.org/api/gasPriceOracle',
  },
  {
    parseResponse: (data: any) => (data.fast ? (data.fast / 10).toString() : null),
    responseUnit: 'gwei',
    url: 'https://ethgasstation.info/api/ethgasAPI.json',
  },
  {
    parseResponse: (data: any) => (data.fast ? data.fast.toString() : null),
    responseUnit: 'gwei',
    url: 'https://gasprice.poa.network/',
  },
  {
    parseResponse: (data: any) => (data.fast ? data.fast.toString() : null),
    responseUnit: 'gwei',
    url: 'https://api.anyblock.tools/ethereum/latest-minimum-gasprice',
  },
];

type GasPriceResponse = ethers.BigNumber | null;

async function getGasPriceFromHttpFeed(feed: GasPriceHttpFeed): Promise<GasPriceResponse> {
  const request = { timeout: TIMEOUT, url: feed.url };
  const [err, res] = await go(get(request));
  if (err || !res) {
    logger.logJSON('ERROR', `Failed to fetch gas price from: ${feed.url}. Reason: ${err}`);
    return null;
  }

  const gasPrice = feed.parseResponse(res.data);
  if (!gasPrice || !isFinite(+gasPrice)) {
    // Something went wrong when trying to normalize the response
    logger.logJSON('ERROR', `Failed to parse gas price for ${feed.url}. Value: ${gasPrice}`);
    return null;
  }

  // Handle other response units if needed.
  // if (feed.responseUnit !== 'gwei') {
  //   ...
  // }

  return ethereum.gweiToWei(gasPrice);
}

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
  const gasPriceHttpRequests = GAS_PRICE_HTTP_FEEDS.map((feed) => getGasPriceFromHttpFeed(feed));
  const gasPriceContractCalls = [getDataFeedGasPrice(state)];

  const gasPrices = await Promise.all([...gasPriceHttpRequests, ...gasPriceContractCalls]);
  const successfulPrices = gasPrices.filter((gp) => !!gp) as ethers.BigNumber[];

  // Fallback if no successful response is received
  if (isEmpty(successfulPrices)) {
    logger.logJSON('INFO', 'Attempting to get gas price from Ethereum node...');

    const nodeGasPrice = await getEthNodeGasPrice(state);

    // It's very unlikely that no source has returned a successful response, but just in case,
    // return a fallback price.
    if (!nodeGasPrice) {
      const fallbackGweiPrice = ethereum.weiToGwei(FALLBACK_WEI_PRICE);
      const message = `Failed to get gas prices from any sources. Falling back to default price ${fallbackGweiPrice} Gwei`;
      logger.logJSON('ERROR', message);
      return FALLBACK_WEI_PRICE;
    }

    return nodeGasPrice;
  }

  // We want to use the highest gas prices from the sources that returned a successful response.
  const highestWeiPrice = ethereum.sortBigNumbers(successfulPrices)[0];

  // We need to limit the gas price in case any one of the sources returns an unexpectedly
  // high gas price.
  const finalWeiPrice = highestWeiPrice.gt(MAXIMUM_WEI_PRICE) ? MAXIMUM_WEI_PRICE : highestWeiPrice;

  return finalWeiPrice;
}
