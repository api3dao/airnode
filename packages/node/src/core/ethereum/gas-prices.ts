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
  return parseFloat(res.data['fast']) || null;
}

async function getEthGasStationGasPrice(): Promise<GasPriceResponse> {
  const request = { ...baseRequest, url: 'https://ethgasstation.info/api/ethgasAPI.json' };
  const [err, res] = await go(get(request));
  if (err) {
    return null;
  }
  return res.data['fast'] / 10 || null;
}

async function getPOANetworkGasPrice(): Promise<GasPriceResponse> {
  const request = { ...baseRequest, url: 'https://gasprice.poa.network/' };
  const [err, res] = await go(get(request));
  if (err) {
    return null;
  }
  return res.data['fast'] || null;
}

async function getAnyblockGasPrice(): Promise<GasPriceResponse> {
  const request = { ...baseRequest, url: 'https://api.anyblock.tools/ethereum/latest-minimum-gasprice' };
  const [err, res] = await go(get(request));
  if (err) {
    return null;
  }
  return res.data['fast'] || null;
}

// TODO:
// async function getDataFeedGasPrice(): Promise<GasPriceResponse> {
//   const provider = getProvider();
//   const contract = new ethers.Contract(GasPriceFeed.addresses.ropsten, GasPriceFeed.ABI, provider);
//   const result = await contract.latestAnswer() as number;
//   return result;
// }

export async function getMaxGasPrice() {
  const gasPriceRequests: Promise<GasPriceResponse>[] = [
    getEtherchainGasPrice(),
    getEthGasStationGasPrice(),
    getPOANetworkGasPrice(),
    getAnyblockGasPrice(),
    // getDataFeedGasPrice(),
  ];

  const gasPrices = await Promise.all(gasPriceRequests);
  const successfulPrices = gasPrices.filter((gp) => !!gp) as number[];
  const maxGasPrice = Math.max(...successfulPrices);

  return maxGasPrice;
}
