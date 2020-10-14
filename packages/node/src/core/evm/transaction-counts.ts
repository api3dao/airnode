import { ethers } from 'ethers';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../logger';
import { LogsData } from '../../types';

interface TransactionCountByAddress {
  [index: string]: number;
}

interface FetchOptions {
  currentBlock: number;
  provider: ethers.providers.JsonRpcProvider;
}

async function getWalletTransactionCount(
  address: string,
  options: FetchOptions
): Promise<LogsData<TransactionCountByAddress | null>> {
  const providerCall = () => options.provider.getTransactionCount(address, options.currentBlock) as Promise<number>;
  const retryableCall = retryOperation(2, providerCall, { timeouts: [4000, 4000] }) as Promise<number>;

  const [err, count] = await go(retryableCall);
  if (err || count === null) {
    const log = logger.pend('ERROR', `Unable to fetch transaction count for wallet:${address}`, err);
    return [[log], null];
  }
  return [[], { [address]: count }];
}

export async function fetchByAddress(
  addresses: string[],
  options: FetchOptions
): Promise<LogsData<TransactionCountByAddress>> {
  // Ensure that there are no duplicated addresses
  const uniqueAddresses = uniq(addresses);

  // Fetch all transaction counts in parallel
  const promises = uniqueAddresses.map((address) => getWalletTransactionCount(address, options));
  const logsWithCounts = await Promise.all(promises);
  const logs = flatMap(logsWithCounts, (c) => c[0]);
  const countsByIndex = logsWithCounts.map((c) => c[1]);

  const successfulResults = countsByIndex.filter((r) => !!r) as TransactionCountByAddress[];

  // Merge all successful results into a single object
  const combinedResults = Object.assign({}, ...successfulResults);

  return [logs, combinedResults];
}
