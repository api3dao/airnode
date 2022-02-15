import { Endpoint } from '@api3/airnode-ois';
import { processHttpRequest } from './process-http-request';
import * as api from '../api';
import * as fixtures from '../../test/fixtures';

const ENDPOINT_ID = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';

function buildConfigWithEndpoint(endpoint?: Endpoint) {
  const endpoints = endpoint ? [endpoint] : [];
  return fixtures.buildConfig({ ois: [fixtures.buildOIS({ endpoints })] });
}

describe('processHttpRequest', () => {
  it('returns an error if no endpoint trigger with given ID is found', async () => {
    const nonExistentEndpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff';
    const [err, res] = await processHttpRequest(fixtures.buildConfig(), nonExistentEndpointId, {});
    expect(res).toBeNull();
    expect(err).toEqual(new Error(`Unable to find endpoint with ID:'${nonExistentEndpointId}'`));
  });

  it('returns an error if no endpoint with given ID is found', async () => {
    const [err, res] = await processHttpRequest(buildConfigWithEndpoint(), ENDPOINT_ID, {});
    expect(res).toBeNull();
    expect(err).toEqual(new Error(`No endpoint definition for endpoint ID '${ENDPOINT_ID}'`));
  });

  it('returns an error if endpoint testability is not specified', async () => {
    const endpoint = fixtures.buildOIS().endpoints[0];
    const config = buildConfigWithEndpoint(endpoint);
    config.triggers.http = [];

    const [err, res] = await processHttpRequest(config, ENDPOINT_ID, {});
    expect(res).toBeNull();
    expect(err).toEqual(new Error(`Unable to find endpoint with ID:'${ENDPOINT_ID}'`));
  });

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
    const mockedResponse = { success: true, value: 'value', signature: 'signature' } as const;
    spy.mockResolvedValueOnce([[], mockedResponse]);

    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
    const [err, res] = await processHttpRequest(fixtures.buildConfig(), ENDPOINT_ID, parameters);

    const config = fixtures.buildConfig();
    const aggregatedApiCall = fixtures.buildAggregatedTestingGatewayApiCall({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      endpointId: ENDPOINT_ID,
      id: expect.any(String),
      parameters,
    });

    expect(err).toBeNull();
    expect(res).toEqual(mockedResponse);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ config, aggregatedApiCall });
  });
});
