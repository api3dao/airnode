import { getMaxGweiGasPrice } from './ethereum/gas-prices';

export async function main() {
  // const currentBlock = await eth.getCurrentBlockNumber();

  const maxGasPrice = await getMaxGweiGasPrice();
  return maxGasPrice;
}
