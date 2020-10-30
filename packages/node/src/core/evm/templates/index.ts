import * as application from './template-application';
import * as authorization from '../authorization';
import * as logger from '../../logger';
import * as templates from './template-fetching';
import * as verification from './template-verification';
import { EVMProviderState, ProviderState } from '../../../types';

export async function fetchTemplatesAndAuthorizations(state: ProviderState<EVMProviderState>) {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId, requests } = state;

  const baseLogOptions = {
    format: state.settings.logFormat,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  const fetchOptions = {
    address: state.contracts.Convenience,
    provider: state.provider,
    providerId: state.settings.providerId,
  };

  // Fetch templates. This should not throw
  const [fetchTemplLogs, templatesById] = await templates.fetch(requests.apiCalls, fetchOptions);
  logger.logPending(fetchTemplLogs, baseLogOptions);

  const [verifyLogs, verifiedApiCalls] = verification.verify(requests.apiCalls, templatesById);
  logger.logPending(verifyLogs, baseLogOptions);

  const [appliedLogs, templatedApiCalls] = application.mergeApiCallsWithTemplates(verifiedApiCalls, templatesById);
  logger.logPending(appliedLogs, baseLogOptions);

  // Fetch authorizations. This should not throw
  const [authLogs, authorizationsByEndpoint] = await authorization.fetch(templatedApiCalls, fetchOptions);
  logger.logPending(authLogs, baseLogOptions);

  return { authorizationsByEndpoint, templatedApiCalls };
}
