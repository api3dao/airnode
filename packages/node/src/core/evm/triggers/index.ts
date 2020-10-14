import * as requests from '../requests';
import * as logger from '../../logger';
import { EVMProviderState, LogsData, ProviderState, WalletDataByIndex } from '../../../types';

export async function fetchWalletDataByIndex(
  state: ProviderState<EVMProviderState>
): Promise<LogsData<WalletDataByIndex>> {
  // Let this throw if it fails. We can't do anything if the logs cannot be fetched
  const pendingRequests = await requests.fetchPendingRequests(state);

  const { apiCalls, walletDesignations, withdrawals } = pendingRequests;

  const log = logger.pend(
    'INFO',
    `Pending requests: ${apiCalls.length} API call(s), ${withdrawals.length} withdrawal(s), ${walletDesignations.length} wallet designation(s)`
  );
  const walletDataByIndex = requests.groupRequestsByWalletIndex(pendingRequests);

  return [[log], walletDataByIndex];
}
