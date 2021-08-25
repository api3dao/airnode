import { ethers } from 'ethers';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import * as wallet from './wallet';
import { go } from '../utils/promise-utils';
import * as logger from '../logger';
import { DEFAULT_RETRY_TIMEOUT_MS } from '../constants';
import { LogsData } from '../types';

export interface TransactionCountBySponsorAddress {
  readonly [sponsorAddress: string]: number;
}

interface FetchOptions {
  readonly currentBlock: number;
  readonly masterHDNode: ethers.utils.HDNode;
  readonly provider: ethers.providers.JsonRpcProvider;
}

async function getWalletTransactionCount(
  sponsorAddress: string,
  options: FetchOptions
): Promise<LogsData<TransactionCountBySponsorAddress | null>> {
  const address = wallet.deriveSponsorWalletAddress(options.masterHDNode, sponsorAddress);
  const operation = () => options.provider.getTransactionCount(address, options.currentBlock);
  const [err, count] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || count === null) {
    const log = logger.pend('ERROR', `Unable to fetch transaction count for wallet:${address}`, err);
    return [[log], null];
  }
  return [[], { [sponsorAddress]: count }];
}

export async function fetchBySponsor(
  sponsorAddresses: string[],
  options: FetchOptions
): Promise<LogsData<TransactionCountBySponsorAddress>> {
  // Ensure that there are no duplicated addresses
  const uniqueAddresses = uniq(sponsorAddresses);

  // Fetch all transaction counts in parallel
  const promises = uniqueAddresses.map((address) => getWalletTransactionCount(address, options));
  const logsWithCounts = await Promise.all(promises);
  const logs = flatMap(logsWithCounts, (c) => c[0]);
  const countsBySponsor = logsWithCounts.map((c) => c[1]);

  const successfulResults = countsBySponsor.filter((r) => !!r) as TransactionCountBySponsorAddress[];

  // Merge all successful results into a single object
  const combinedResults = Object.assign({}, ...successfulResults);

  return [logs, combinedResults];
}
