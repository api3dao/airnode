import * as ethereum from './ethereum';
import { go } from './utils/promise-utils';
import * as logger from './utils/logger';

export async function main() {
  // This should always return a value here. The promise should never fail.
  const maxGasPrice = await ethereum.getMaxGweiGasPrice();

  // Get the current block number so we know where to search until for oracle requests.
  const [err, currentBlock] = await go(ethereum.getCurrentBlockNumber());
  if (err) {
    logger.logJSON('ERROR', `Failed to get current block. Reason: ${err}`);
    return;
  }

  // Collect all oracle requests from the chain
  const [err2, oracleRequests] = await go(ethereum.getOracleRequests(currentBlock));
  if (err2) {
    logger.logJSON('ERROR', `Failed to get oracle requests. Reason: ${err2}`);
    return;
  }

  return [maxGasPrice, oracleRequests];
}
