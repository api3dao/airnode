import * as requests from './requests';
import * as logger from '../utils/logger';
import { ProviderState, WalletDataByIndex } from '../../types';

export async function fetchWalletDataByIndex(state: ProviderState): Promise<WalletDataByIndex> {
  // Let this throw if it fails. We can't do anything if the logs cannot be fetched
  const pendingRequests = await requests.fetchPendingRequests(state);

  const { apiCalls, walletDesignations, withdrawals } = pendingRequests;

  const pendingRequestsMsg = `Pending requests: ${apiCalls.length} API call(s), ${withdrawals.length} withdrawal(s), ${walletDesignations.length} wallet designation(s)`;
  logger.logProviderJSON(state.config.name, 'INFO', pendingRequestsMsg);

  const walletDataByIndex = requests.groupRequestsByWalletIndex(state, pendingRequests);

  return walletDataByIndex;
}
