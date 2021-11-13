import { Endpoint } from '@api3/airnode-ois';
import { testApi } from './test-api';
import * as worker from '../adapters/http/worker';
import * as fixtures from '../../test/fixtures';

const ENDPOINT_ID = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353';

function buildConfigWithEndpoint(endpoint?: Endpoint) {
  const endpoints = endpoint ? [endpoint] : [];
  return fixtures.buildConfig({ ois: [fixtures.buildOIS({ endpoints })] });
}

describe('testApi', () => {
  it('returns an error if no endpoint trigger with given ID is found', async () => {
    const nonexistentEndpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff';
    const [err, res] = await testApi(fixtures.buildConfig(), nonexistentEndpointId, {});
    expect(res).toBeNull();
    expect(err).toEqual(new Error(`No such endpoint with ID '${nonexistentEndpointId}'`));
  });

  it('returns an error if no endpoint with given ID is found', async () => {
    const [err, res] = await testApi(buildConfigWithEndpoint(), ENDPOINT_ID, {});
    expect(res).toBeNull();
    expect(err).toEqual(new Error(`No endpoint definition for endpoint ID '${ENDPOINT_ID}'`));
  });

  it('returns an error if endpoint testability is not specified', async () => {
    const unspecifiedEndpoint = fixtures.buildOIS().endpoints[0];
    // eslint-disable-next-line functional/immutable-data
    delete unspecifiedEndpoint.testable;

    const [err, res] = await testApi(buildConfigWithEndpoint(unspecifiedEndpoint), ENDPOINT_ID, {});
    expect(res).toBeNull();
    expect(err).toEqual(new Error(`Endpoint with ID '${ENDPOINT_ID}' can't be tested`));
  });

  it('returns an error if endpoint testability is turned off', async () => {
    const offEndpoint = { ...fixtures.buildOIS().endpoints[0], testable: false };

    const [err, res] = await testApi(buildConfigWithEndpoint(offEndpoint), ENDPOINT_ID, {});
    expect(res).toBeNull();
    expect(err).not.toBeNull();
  });

  it('calls the API with given parameters', async () => {
    const spy = jest.spyOn(worker, 'spawnNewApiCall');
    spy.mockResolvedValueOnce([[], { value: '1000' }]);

    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
    const [err, res] = await testApi(fixtures.buildConfig(), ENDPOINT_ID, parameters);

    const aggregatedApiCall = fixtures.buildAggregatedApiCall({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      sponsorAddress: '',
      requesterAddress: '',
      sponsorWalletAddress: '',
      chainId: '',
      endpointId: ENDPOINT_ID,
      id: expect.any(String),
      parameters,
    });
    const logOptions = {
      format: 'plain',
      level: 'DEBUG',
      meta: {
        requestId: expect.any(String),
      },
    };
    const workerOptions = {
      cloudProvider: 'local',
      airnodeAddressShort: expect.any(String),
      region: 'us-east-1',
      stage: 'test',
    };

    expect(err).toBeNull();
    expect(res).toEqual({ value: '1000' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(aggregatedApiCall, logOptions, workerOptions, { forTestingGateway: true });
  });
});
