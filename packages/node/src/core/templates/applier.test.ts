import * as fixtures from 'test/fixtures';
import * as providerState from '../providers/state';
import { ProviderState } from '../../types';
import * as applier from './applier';

describe('mapApiCallsWithTemplates', () => {
  let initialState: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    initialState = providerState.create(config, 0);
  });

  it('returns API calls without a template ID', () => {
    const apiCalls = [fixtures.requests.createApiCall({ templateId: null })];
    const state = providerState.update(initialState, { apiCalls });
    applier.mapApiCallsWithTemplates(state, {});
  });
});
