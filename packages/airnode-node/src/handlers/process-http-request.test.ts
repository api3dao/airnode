import { Endpoint } from '@api3/ois';
import { processHttpRequest } from './process-http-request';
import * as api from '../api';
import * as fixtures from '../../test/fixtures';
import { HttpGatewayApiCallSuccessResponse } from '../types';

const ENDPOINT_ID = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';

function buildConfigWithEndpoint(endpoint?: Endpoint) {
  const endpoints = endpoint ? [endpoint] : [];
  return fixtures.buildConfig({ ois: [fixtures.buildOIS({ endpoints })] });
}

describe('processHttpRequest', () => {
  jest.setTimeout(10_000);
  it('returns an error if endpoint testability is turned off', async () => {
    const endpoint = fixtures.buildOIS().endpoints[0];
    const config = buildConfigWithEndpoint(endpoint);
    config.triggers.http = [];

    const [err, res] = await processHttpRequest(buildConfigWithEndpoint(endpoint), ENDPOINT_ID, {});
    expect(res).toBeNull();
    expect(err).not.toBeNull();
  });

  it('calls the API with given parameters', async () => {
    const spy = jest.spyOn(api, 'callApi');
    // What exactly the API returns doesn't matter for this test
    const mockedResponse = {
      success: true,
      data: { encodedValue: 'value', rawValue: 'raw-value', values: ['raw-value'] },
    } as HttpGatewayApiCallSuccessResponse;
    spy.mockResolvedValueOnce([[], mockedResponse]);

    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
    const [err, res] = await processHttpRequest(fixtures.buildConfig(), ENDPOINT_ID, parameters);

    const config = fixtures.buildConfig();
    const aggregatedApiCall = fixtures.buildAggregatedHttpGatewayApiCall({
      parameters,
    });

    expect(err).toBeNull();
    expect(res).toEqual(mockedResponse);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ type: 'http-gateway', config, aggregatedApiCall });
  });
});
