import isArray from 'lodash/isArray';
import * as ethereum from './ethereum';
import * as state from './state';
import * as logger from './utils/logger';
import { go } from './utils/promise-utils';
import { specs } from './config';

function processApis() {
  const apiSpecs = isArray(specs) ? specs : [specs];

  apiSpecs.forEach((apiSpec) => {
    logger.logJSON('INFO', `Processing: ${apiSpec.info.title}...`);
  });
}

export async function main() {
  const newState = await state.initialize();

  const gasPrice = await ethereum.getGasPrice(newState);

  logger.logJSON('INFO', `Gas price set to ${ethereum.weiToGwei(gasPrice)} Gwei`);
  const state2 = state.update(newState, { gasPrice });

  // Get the current block number so we know where to search until for oracle requests.
  const [err, currentBlock] = await go(ethereum.getCurrentBlockNumber(state2));
  if (err) {
    logger.logJSON('ERROR', `Failed to get current block. Reason: ${err}`);
    return;
  }

  processApis();

  return [state2, currentBlock];
}
