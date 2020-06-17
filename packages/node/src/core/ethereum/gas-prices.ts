import { ethers } from 'ethers';
import isEmpty from 'lodash/isEmpty';
import isFinite from 'lodash/isFinite';
import { get } from '../clients/http';
import { go } from '../utils/promise-utils';
import { GasPriceFeed } from './contracts';
import * as eth from '../eth';
import * as logger from '../utils/logger';

// We don't want to hold everything up so limit each request to 10 seconds maximum
const TIMEOUT = 10_000;
const FALLBACK_GWEI_PRICE = 40;
const MAXIMUM_GWEI_PRICE = 1000;

interface GasPriceHttpFeed {
  onSuccess: (res: any) => number;
  url: string;
}

// TODO: These should be configurable (possibly by an onchain event?).
// If one API provider is down or is no longer serving free gas prices,
// we don't want to spam the logs every run.
const GAS_PRICE_HTTP_FEEDS: GasPriceHttpFeed[] = [
  {
    url: 'https://www.etherchain.org/api/gasPriceOracle',
    onSuccess: (res: any) => parseFloat(res.data.fast),
  },
  {
    url: 'https://ethgasstation.info/api/ethgasAPI.json',
    onSuccess: (res: any) => res.data.fast / 10,
  },
  {
    url: 'https://gasprice.poa.network/',
    onSuccess: (res: any) => res.data.fast,
  },
  {
    url: 'https://api.anyblock.tools/ethereum/latest-minimum-gasprice',
    onSuccess: (res: any) => res.data.fast,
  },
];

type GasPriceResponse = number | null;

async function getGasPriceFromHttpFeed(feed: GasPriceHttpFeed): Promise<GasPriceResponse> {
  const request = { timeout: TIMEOUT, url: feed.url };
  const [err, res] = await go(get(request));
  if (err) {
    logger.logJSON('ERROR', `Failed to fetch gas price from: ${feed.url}. Reason: ${err}`);
    return null;
  }

  const gasPrice = feed.onSuccess(res);
  if (!isFinite(gasPrice)) {
    // Something went wrong when trying to normalize the response
    logger.logJSON('ERROR', `Failed to parse gas price for ${feed.url}. Value: ${gasPrice}`);
    return null;
  }

  return gasPrice || null;
}

async function getDataFeedGasPrice(): Promise<GasPriceResponse> {
  const network = eth.getNetwork();
  const provider = eth.getProvider();
  const contract = new ethers.Contract(GasPriceFeed.addresses[network], GasPriceFeed.ABI, provider);
  const [err, weiPrice] = await go(contract.latestAnswer());
  if (err) {
    logger.logJSON('ERROR', `Failed to get gas price from gas price feed contract. Error: ${err}`);
    return null;
  }
  return parseFloat(ethers.utils.formatUnits(weiPrice, 'gwei'));
}

export async function getMaxGweiGasPrice(): Promise<number> {
  const gasPriceHttpRequests = GAS_PRICE_HTTP_FEEDS.map((feed) => getGasPriceFromHttpFeed(feed));
  const gasPriceContractCalls = [getDataFeedGasPrice()];

  const gasPrices = await Promise.all([...gasPriceHttpRequests, ...gasPriceContractCalls]);
  const successfulPrices = gasPrices.filter((gp) => !!gp) as number[];

  // Fallback if no successful response is received
  if (isEmpty(successfulPrices)) {
    logger.logJSON('ERROR', `Failed to get gas prices. Falling back to default price ${FALLBACK_GWEI_PRICE} Gwei`);
    return FALLBACK_GWEI_PRICE;
  }

  const highestGasPrice = Math.max(...successfulPrices);
  const finalGasPrice = Math.min(highestGasPrice, MAXIMUM_GWEI_PRICE);

  logger.logJSON('INFO', `Gas price set to ${finalGasPrice} Gwei`);

  return finalGasPrice;
}
