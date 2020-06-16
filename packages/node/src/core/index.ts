import { getMaxGasPrice } from './ethereum/gas-prices';

export async function main() {
  // const currentBlock = await eth.getCurrentBlockNumber();

  const maxGasPrice = await getMaxGasPrice();
  console.log('============================');
  console.log('GAS PRICE: ', maxGasPrice);
  console.log('============================');
  return maxGasPrice;
}
