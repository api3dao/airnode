import { get } from '../clients/http';
import { go } from '../utils/promise-utils';

type GasPriceResponse = number | null;

// We don't want to hold everything up so limit each request to 10 seconds maximum
const TIMEOUT = 10_000;

const baseRequest = {
  timeout: TIMEOUT,
};

async function getEtherchainGasPrice(): Promise<GasPriceResponse> {
  const request = { ...baseRequest, url: 'https://www.etherchain.org/api/gasPriceOracle' };
  const [err, res] = await go(get(request));
  if (err) {
    return null;
  }
  // TODO: do we want to use 'fast' or 'fastest'?
  return parseFloat(res.data['fastest']) || null;
}

async function getEthGasStationGasPrice(): Promise<GasPriceResponse> {
  const request = { ...baseRequest, url: 'https://ethgasstation.info/api/ethgasAPI.json' };
  const [err, res] = await go(get(request));
  if (err) {
    return null;
  }
  // TODO: do we want to use 'fast' or 'fastest'?
  return res.data['fastest'] / 10 || null;
}

// TODO:
// async function getDataFeedGasPrice(): Promise<GasPriceResponse> {
//   const provider = getProvider();
//   const contract = new ethers.Contract(GasPriceFeed.addresses.ropsten, GasPriceFeed.abi, provider);
//   const result = await contract.latestAnswer() as number;
//   return result;
// }

export async function getMaxGasPrice() {
  const gasPriceRequests: Promise<GasPriceResponse>[] = [
    getEtherchainGasPrice(),
    getEthGasStationGasPrice(),
    // getDataFeedGasPrice(),
  ];

  const gasPrices = await Promise.all(gasPriceRequests);
  const successfulPrices = gasPrices.filter((gp) => !!gp) as number[];
  const maxGasPrice = Math.max(...successfulPrices);

  return maxGasPrice;
}
