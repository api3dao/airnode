import { Endpoint } from '@api3/airnode-ois';
import { processHttpSignedDataRequest } from './process-http-signed-data-request';
import * as api from '../api';
import * as fixtures from '../../test/fixtures';
import { HttpSignedDataApiCallSuccessResponse } from '../types';

const ENDPOINT_ID = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';
const TEMPLATE_ID = '0xaa1525fe964092a826934ff09c75e1db395b947543a4ca3eb4a19628bad6c6d5';

function buildConfigWithEndpoint(endpoint?: Endpoint) {
  const endpoints = endpoint ? [endpoint] : [];
  return fixtures.buildConfig({ ois: [fixtures.buildOIS({ endpoints })] });
}

describe('processHttpSignedDataRequests', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('returns an error if no endpoint with given ID is found', async () => {
    const nonExistentEndpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff';
    const [err, res] = await processHttpSignedDataRequest(fixtures.buildConfig(), nonExistentEndpointId, '');
    expect(res).toBeNull();
    expect(err).toEqual(new Error(`Unable to find endpoint with ID:'${nonExistentEndpointId}'`));
  });

  it("returns an error if endpoint doesn't allow getting signed data", async () => {
    const endpoint = fixtures.buildOIS().endpoints[0];
    const config = buildConfigWithEndpoint(endpoint);
    config.triggers.httpSignedData = [];

    const [err, res] = await processHttpSignedDataRequest(config, ENDPOINT_ID, '');
    expect(res).toBeNull();
    expect(err).toEqual(new Error(`Unable to find endpoint with ID:'${ENDPOINT_ID}'`));
  });

  describe('returns an error for missing parameters', () => {
    it('missing "encodedParameters" parameter', async () => {
      const encodedParameters = '';
      const [err, res] = await processHttpSignedDataRequest(fixtures.buildConfig(), ENDPOINT_ID, encodedParameters);

      expect(res).toBeNull();
      expect(err).toEqual(new Error(`Request contains invalid encodedParameters: ${encodedParameters}`));
    });
  });

  it('calls the API with given encodedParameters', async () => {
    const spy = jest.spyOn(api, 'callApi');
    // What exactly the API returns doesn't matter for this test
    const mockedResponse = {
      success: true,
      data: { encodedValue: 'value', timestamp: '123456789', signature: 'signature' },
    } as HttpSignedDataApiCallSuccessResponse;
    spy.mockResolvedValueOnce([[], mockedResponse]);

    const encodedParameters =
      '0x317373730000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000045544800000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f706174680000000000000000000000000000000000000000000000000000007072696365000000000000000000000000000000000000000000000000000000';
    const decodedParameters = {
      from: 'ETH',
      _type: 'int256',
      _path: 'price',
    };
    const [err, res] = await processHttpSignedDataRequest(fixtures.buildConfig(), ENDPOINT_ID, encodedParameters);

    const config = fixtures.buildConfig();
    const aggregatedApiCall = fixtures.buildAggregatedHttpSignedDataApiCall({
      id: expect.any(String),
      endpointId: ENDPOINT_ID,
      parameters: decodedParameters,
      templateId: TEMPLATE_ID,
      template: {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        endpointId: ENDPOINT_ID,
        id: TEMPLATE_ID,
        encodedParameters,
      },
    });

    expect(err).toBeNull();
    expect(res).toEqual(mockedResponse);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ config, aggregatedApiCall });
  });
});
