import * as ethereum from './ethereum';

export async function main() {
  const maxGasPrice = await ethereum.getMaxGweiGasPrice();

  // const currentBlock = await ethereum.getCurrentBlockNumber();

  return maxGasPrice;
}
