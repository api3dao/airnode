import { ethers } from 'ethers';
import isFinite from 'lodash/isFinite';
import { get } from '../clients/http';
import { go } from '../utils/promise-utils';
import { GasPriceFeed } from './contracts';
import * as eth from '../eth';
import * as logger from '../utils/logger';

type GasPriceResponse = number | null;

// We don't want to hold everything up so limit each request to 10 seconds maximum
const TIMEOUT = 10_000;

interface GasPriceHttpFeed {
  onSuccess: (res: any) => number;
  url: string;
}

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
  const result = await contract.latestAnswer();
  return parseFloat(ethers.utils.formatUnits(result, 'gwei'));
}

export async function getMaxGasPrice() {
  const gasPriceHttpRequests = GAS_PRICE_HTTP_FEEDS.map((feed) => getGasPriceFromHttpFeed(feed));
  const gasPriceContractCalls = [getDataFeedGasPrice()];

  const gasPrices = await Promise.all([...gasPriceHttpRequests, ...gasPriceContractCalls]);
  const successfulPrices = gasPrices.filter((gp) => !!gp) as number[];
  const maxGasPrice = Math.max(...successfulPrices);

  return maxGasPrice;
}
