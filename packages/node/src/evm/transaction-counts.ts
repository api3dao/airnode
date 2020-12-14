import { ethers } from 'ethers';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../logger';
import * as wallet from './wallet';
import { LogsData } from '../types';

export interface TransactionCountByRequesterIndex {
  [index: string]: number;
}

interface FetchOptions {
  currentBlock: number;
  masterHDNode: ethers.utils.HDNode;
  provider: ethers.providers.JsonRpcProvider;
}

async function getWalletTransactionCount(
  requesterIndex: string,
  options: FetchOptions
): Promise<LogsData<TransactionCountByRequesterIndex | null>> {
  const address = wallet.deriveWalletAddressFromIndex(options.masterHDNode, requesterIndex);
  const providerCall = () => options.provider.getTransactionCount(address, options.currentBlock);
  const retryableCall = retryOperation(2, providerCall);
  const [err, count] = await go(retryableCall);
  if (err || count === null) {
    const log = logger.pend('ERROR', `Unable to fetch transaction count for wallet:${address}`, err);
    return [[log], null];
  }
  return [[], { [requesterIndex]: count }];
}

export async function fetchByRequesterIndex(
  requesterIndices: string[],
  options: FetchOptions
): Promise<LogsData<TransactionCountByRequesterIndex>> {
  // Ensure that there are no duplicated addresses
  const uniqueAddresses = uniq(requesterIndices);

  // Fetch all transaction counts in parallel
  const promises = uniqueAddresses.map((address) => getWalletTransactionCount(address, options));
  const logsWithCounts = await Promise.all(promises);
  const logs = flatMap(logsWithCounts, (c) => c[0]);
  const countsByIndex = logsWithCounts.map((c) => c[1]);

  const successfulResults = countsByIndex.filter((r) => !!r) as TransactionCountByRequesterIndex[];

  // Merge all successful results into a single object
  const combinedResults = Object.assign({}, ...successfulResults);

  return [logs, combinedResults];
}
