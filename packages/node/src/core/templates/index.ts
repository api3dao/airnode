import * as application from './template-application';
import * as authorization from '../requests/api-calls/authorization';
import * as fetching from './template-fetching';
import { ProviderState, WalletData, WalletDataByIndex } from '../../types';

interface TransactionCountByWalletIndex {
  [index: string]: number;
}

export async function fetchTemplatesAndAuthorizations(state: ProviderState) {
  // Fetch templates. This should not throw
  const templatesById = await fetching.fetch(state);

  // NB: This should *not* update the state at this point. We don't want to update
  // state while in a promise
  const stateWithTemplates = application.mergeApiCallsWithTemplates(state, templatesById);

  // Fetch authorizations. This should not throw
  const authorizationsByEndpoint = await authorization.fetch(stateWithTemplates);

  return {
    authorizationsByEndpoint,
    walletDataWithTemplates: stateWithTemplates.walletDataByIndex,
  };
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
