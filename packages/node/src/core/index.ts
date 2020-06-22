import * as ethereum from './ethereum';
import * as state from './state';
import * as logger from './utils/logger';

export async function main() {
  const newState = await state.initialize();

  const gasPrice = await ethereum.getGasPrice(newState);

  logger.logJSON('INFO', `Gas price set to ${ethereum.weiToGwei(gasPrice)} Gwei`);
  const state2 = state.update(newState, { gasPrice });

  // const currentBlock = await ethereum.getCurrentBlockNumber();

  return state2;
}
