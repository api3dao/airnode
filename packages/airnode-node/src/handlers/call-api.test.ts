import * as fixtures from '../../test/fixtures';
import * as api from '../api';
import { callApi } from '.';

describe('callApi', () => {
  it('calls API', () => {
    const initializeSpy = jest.spyOn(api, 'callApi');
    const config = fixtures.buildConfig();
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall();

    callApi(config, aggregatedApiCall);
    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledWith({ type: 'regular', config, aggregatedApiCall });
  });
});
