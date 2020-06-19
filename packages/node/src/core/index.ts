import isArray from 'lodash/isArray';
import * as ethereum from './ethereum';
import { go } from './utils/promise-utils';
import * as logger from './utils/logger';
import { specs } from './config';

function processApis() {
  const apiSpecs = isArray(specs) ? specs : [specs];

  apiSpecs.forEach((apiSpec) => {
    logger.logJSON('INFO', `Processing: ${apiSpec.info.title}...`);
  });
}

export async function main() {
  // This should always return a value here. The promise should never fail.
  const maxGasPrice = await ethereum.getMaxGweiGasPrice();

  // Get the current block number so we know where to search until for oracle requests.
  const [err, currentBlock] = await go(ethereum.getCurrentBlockNumber());
  if (err) {
    logger.logJSON('ERROR', `Failed to get current block. Reason: ${err}`);
    return;
  }

  processApis();

  return [maxGasPrice, currentBlock];
}
