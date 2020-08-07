import * as applier from './template-applier';
import * as authorization from '../requests/api-calls/authorization';
import * as fetcher from './template-fetcher';
import { ProviderState } from '../../types';

export async function fetchTemplatesAndAuthorizations(state: ProviderState) {
  // Fetch templates. This should not throw
  const templatesById = await fetcher.fetch(state);

  // NB: This should *not* update the state at this point. We don't want to update
  // state while in a promise
  const apiCallsWithTemplates = applier.mapApiCallsWithTemplates(state, templatesById);

  // Fetch authorizations. This should not throw
  const authorizationsByEndpoint = await authorization.fetch(state, apiCallsWithTemplates);

  return { apiCallsWithTemplates, authorizationsByEndpoint };
}
