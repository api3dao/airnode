import * as applier from './applier';
import * as authorization from '../requests/api-calls/authorization';
import * as fetcher from './fetcher';
import { ProviderState } from '../../types';

export async function fetchTemplatesAndAuthorizations(state: ProviderState) {
  // Fetch templates. This should not throw
  const templatesById = await fetcher.fetch(state);

  // NB: This should *not* update the state at this point
  const apiCallsWithTemplates = applier.mapApiCallsWithTemplates(state, templatesById);

  const authorizationsByEndpoint = await authorization.fetch(state, apiCallsWithTemplates);

  return { apiCallsWithTemplates, authorizationsByEndpoint };
}
