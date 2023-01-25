import { ethers } from 'ethers';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import { logger } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import * as wallet from './wallet';
import { BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT } from '../constants';
import { LogsData } from '../types';

export interface TransactionCountBySponsorAddress {
  readonly [sponsorAddress: string]: number;
}

interface FetchOptions {
  readonly currentBlock: number;
  readonly masterHDNode: ethers.utils.HDNode;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly minConfirmations: number;
  readonly mayOverrideMinConfirmations: boolean;
}

async function getWalletTransactionCount(
  sponsorAddress: string,
  options: FetchOptions
): Promise<LogsData<TransactionCountBySponsorAddress | null>> {
  const address = wallet.deriveSponsorWallet(options.masterHDNode, sponsorAddress).address;
  const operation = () =>
    options.provider.getTransactionCount(
      address,
      // Fetch up to currentBlock to handle possibility of _minConfirmations parameter in request
      options.currentBlock - (options.mayOverrideMinConfirmations ? 0 : options.minConfirmations)
    );
  const goCount = await go(operation, { retries: 1, attemptTimeoutMs: BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT });
  if (!goCount.success) {
    const log = logger.pend('ERROR', `Unable to fetch transaction count for wallet:${address}`, goCount.error);
    return [[log], null];
  }
  if (goCount.data === null) {
    const log = logger.pend('ERROR', `Unable to fetch transaction count for wallet:${address}`);
    return [[log], null];
  }
  return [[], { [sponsorAddress]: goCount.data }];
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
