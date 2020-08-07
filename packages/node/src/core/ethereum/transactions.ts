import uniq from 'lodash/uniq';
import * as wallet from './wallet';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../utils/logger';
import { ProviderState } from '../../types';

interface TransactionCountByWalletIndex {
  [index: number]: number;
}

async function getWalletTransactionCount(state: ProviderState, index: number): Promise<TransactionCountByWalletIndex | null> {
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

  const uniqueWalletIndices = uniq([
    ...apiCalls.map(a => a.walletIndex),
    ...withdrawals.map(a => a.walletIndex),
  ]);

  // TODO: what should happen if an index 0 is present in the above array?

  const promises = uniqueWalletIndices.map(index => getWalletTransactionCount(state, index));

  const results = await Promise.all(promises);
  const successfulResults = results.filter((r) => !!r) as TransactionCountByWalletIndex[];

  return Object.assign({}, ...successfulResults);
}
