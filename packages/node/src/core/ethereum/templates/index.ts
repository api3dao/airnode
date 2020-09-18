import { Convenience } from '../contracts';
import * as apiCalls from '../../requests/api-calls/model';
import * as application from './template-application';
import * as authorization from '../authorization';
import * as templates from './template-fetching';
import * as logger from '../../utils/logger';
import { ProviderState, WalletData, WalletDataByIndex } from '../../../types';

interface TransactionCountByWalletIndex {
  [index: string]: number;
}

export async function fetchTemplatesAndAuthorizations(state: ProviderState) {
  const flatApiCalls = apiCalls.flatten(state.walletDataByIndex);

  const fetchOptions = {
    address: Convenience.addresses[state.config.chainId],
    provider: state.provider,
  };
  // Fetch templates. This should not throw
  const [fetchTemplLogs, _fetchTemplErr, templatesById] = await templates.fetch(flatApiCalls, fetchOptions);
  logger.logPendingMessages(state.config.name, fetchTemplLogs);

  const [appliedTemplLogs, _appliedTemplErr, walletDataWithTemplates] = application.mergeApiCallsWithTemplates(
    state.walletDataByIndex,
    templatesById
  );
  logger.logPendingMessages(state.config.name, appliedTemplLogs);

  // We need to flatten again as the API calls previously didn't have templates applied
  const flatApiCallsWithTemplates = apiCalls.flatten(walletDataWithTemplates);

  // Fetch authorizations. This should not throw
  const [authLogs, _authErr, authorizationsByEndpoint] = await authorization.fetch(
    flatApiCallsWithTemplates,
    fetchOptions
  );
  logger.logPendingMessages(state.config.name, authLogs);

  return { authorizationsByEndpoint, walletDataWithTemplates };
}

export function mergeTemplatesAndTransactionCounts(
  walletDataWithTemplates: WalletDataByIndex,
  transactionCountsByWalletIndex: TransactionCountByWalletIndex
): WalletDataByIndex {
  // The wallet data with templates is currently the source of truth
  const walletIndices = Object.keys(walletDataWithTemplates);

  return walletIndices.reduce((acc, index) => {
    const currentData = walletDataWithTemplates[index];
    const transactionCount = transactionCountsByWalletIndex[index];

    const walletData: WalletData = { ...currentData, transactionCount };

    return { ...acc, [index]: walletData };
  }, {});
}
