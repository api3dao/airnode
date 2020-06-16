import { get } from '../clients/http';
import { go } from '../utils/promise-utils';
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
  return feed.onSuccess(res) || null;
}

// TODO:
// async function getDataFeedGasPrice(): Promise<GasPriceResponse> {
//   const provider = getProvider();
//   const contract = new ethers.Contract(GasPriceFeed.addresses.ropsten, GasPriceFeed.ABI, provider);
//   const result = await contract.latestAnswer() as number;
//   return result;
// }

export async function getMaxGasPrice() {
  const gasPriceHttpRequests = GAS_PRICE_HTTP_FEEDS.map((feed) => getGasPriceFromHttpFeed(feed));
  const gasPriceContractCalls = []; // [getDataFeedGasPrice()];

  const gasPrices = await Promise.all([...gasPriceHttpRequests, ...gasPriceContractCalls]);
  const successfulPrices = gasPrices.filter((gp) => !!gp) as number[];
  const maxGasPrice = Math.max(...successfulPrices);

  return maxGasPrice;
}
