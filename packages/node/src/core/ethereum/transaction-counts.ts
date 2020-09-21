import * as wallet from './wallet';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../utils/logger';
import { ProviderState } from '../../types';

interface TransactionCountByWalletIndex {
  [index: string]: number;
}

async function getWalletTransactionCount(
  state: ProviderState,
  index: string
): Promise<TransactionCountByWalletIndex | null> {
  const xpub = wallet.getExtendedPublicKey();
  const address = wallet.deriveWalletAddressFromIndex(xpub, index);

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
  // Filter out duplicates to reduce Ethereum node calls
  const walletIndices = Object.keys(state.walletDataByIndex).sort();

  // Fetch all transaction counts in parallel
  const promises = walletIndices.map((index) => getWalletTransactionCount(state, index));
  const results = await Promise.all(promises);
  const successfulResults = results.filter((r) => !!r) as TransactionCountByWalletIndex[];

  // Merge all successful results into a single object
  return Object.assign({}, ...successfulResults);
}
