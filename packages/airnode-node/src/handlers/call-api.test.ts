import * as fixtures from '../../test/fixtures';
import * as api from '../api';
import { callApi } from '.';

describe('callApi', () => {
  it('calls API', () => {
    const initializeSpy = jest.spyOn(api, 'callApi');
    const payload = {
      config: fixtures.buildConfig(),
      aggregatedApiCall: fixtures.buildAggregatedRegularApiCall(),
    };
    callApi(payload);
    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledWith(payload);
  });
});
