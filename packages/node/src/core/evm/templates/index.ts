import * as apiCalls from '../../requests/api-calls';
import * as application from './template-application';
import * as authorization from '../authorization';
import * as logger from '../../logger';
import * as templates from './template-fetching';
import * as verification from './template-verification';
import * as wallet from '../wallet';
import { EVMProviderState, ProviderState, WalletData, WalletDataByIndex } from '../../../types';

interface TransactionCountByAddress {
  [index: string]: number;
}

export async function fetchTemplatesAndAuthorizations(state: ProviderState<EVMProviderState>) {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId } = state;

  const baseLogOptions = {
    format: state.settings.logFormat,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  const flatApiCalls = apiCalls.flatten(state.walletDataByIndex);

  const fetchOptions = {
    address: state.contracts.Convenience,
    provider: state.provider,
    providerId: state.settings.providerId,
  };
  // Fetch templates. This should not throw
  const [fetchTemplLogs, templatesById] = await templates.fetch(flatApiCalls, fetchOptions);
  logger.logPending(fetchTemplLogs, baseLogOptions);

  const [verifyLogs, verifiedApiCalls] = verification.verify(flatApiCalls, templatesById);
  logger.logPending(verifyLogs, baseLogOptions);

  const [appliedTemplLogs, _appliedTemplErr, walletDataWithTemplates] = application.mergeApiCallsWithTemplates(
    state.walletDataByIndex,
    templatesById
  );
  logger.logPending(appliedTemplLogs, baseLogOptions);

  // We need to flatten again as the API calls previously didn't have templates applied
  const flatApiCallsWithTemplates = apiCalls.flatten(walletDataWithTemplates);

  // Fetch authorizations. This should not throw
  const [authLogs, authorizationsByEndpoint] = await authorization.fetch(flatApiCallsWithTemplates, fetchOptions);
  logger.logPending(authLogs, baseLogOptions);

  return { authorizationsByEndpoint, walletDataWithTemplates };
}

export function mergeTemplatesAndTransactionCounts(
  walletDataWithTemplates: WalletDataByIndex,
  transactionCountsByAddress: TransactionCountByAddress
): WalletDataByIndex {
  const xpub = wallet.getExtendedPublicKey();

  // The wallet data with templates is currently the source of truth
  const walletIndices = Object.keys(walletDataWithTemplates);

  return walletIndices.reduce((acc, index) => {
    const currentData = walletDataWithTemplates[index];
    const address = wallet.deriveWalletAddressFromIndex(xpub, index);
    const transactionCount = transactionCountsByAddress[address];

    const walletData: WalletData = { ...currentData, transactionCount };

    return { ...acc, [index]: walletData };
  }, {});
}
