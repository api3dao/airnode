import uniq from 'lodash/uniq';
import * as wallet from './wallet';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../utils/logger';
import { ProviderState } from '../../types';

interface TransactionCountByWalletIndex {
  [index: number]: number;
}

async function getWalletTransactionCount(
  state: ProviderState,
  index: number
): Promise<TransactionCountByWalletIndex | null> {
  const address = wallet.deriveWalletFromIndex(state.xpub, index);

  const providerCall = () => state.provider.getTransactionCount(address, state.currentBlock!) as Promise<number>;
  const retryableCall = retryOperation(2, providerCall, { timeouts: [4000, 4000] }) as Promise<number>;

  const [err, count] = await go(retryableCall);
  if (err || count === null) {
    const message = `Unable to fetch transcation count for wallet:${address}, index:${index}`;
    logger.logProviderError(state.config.name, message, err);
    return null;
  }
  return { [index]: count };
}

export async function getTransactionCountByIndex(state: ProviderState): Promise<TransactionCountByWalletIndex> {
  const { apiCalls, withdrawals } = state.requests;

  // Filter out duplicates to reduce Ethereum node calls
  const uniqueWalletIndices = uniq([
    ...apiCalls.map((a) => a.walletIndex),
    ...withdrawals.map((a) => a.walletIndex),
    // We also need to get the transaction count for the "admin" wallet
    // as it is needed to designate wallets to requesters.
    0,
  ]);

  // Fetch all transaction counts in parallel
  const promises = uniqueWalletIndices.map((index) => getWalletTransactionCount(state, index));
  const results = await Promise.all(promises);
  const successfulResults = results.filter((r) => !!r) as TransactionCountByWalletIndex[];

  // Merge all successful results into a single object
  return Object.assign({}, ...successfulResults);
}
