import * as adapter from '@api3/adapter';
import { RequestErrorCode } from 'src/types';
import * as fixtures from 'test/fixtures';
import { callApi } from './call-api';

describe('callApi', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('calls the adapter with the given parameters', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
    const aggregatedCall = fixtures.buildAggregatedApiCall({ parameters });
    const [logs, res] = await callApi(fixtures.buildConfig(), aggregatedCall);
    expect(logs).toEqual([]);
    expect(res).toEqual({ value: '0x0000000000000000000000000000000000000000000000000000000005f5e100' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'convertToUSD',
        ois: fixtures.buildOIS(),
        parameters: { from: 'ETH' },
        securitySchemeSecrets: [
          {
            securitySchemeName: 'My Security Scheme',
            value: 'supersecret',
          },
        ],
      },
      { timeout: 20000 }
    );
  });

  describe('with _relay_metadata set', () => {
    it.each([
      ['Includes', 'v1', true],
      ['Includes', 'V1', true],
      ['Does not include', 'version1', false],
      ['Does not include', '1', false],
      ['Does not include', '', false],
      ['Does not include', 'false', false],
      ['Does not include', undefined, false],
    ])('%s Airnode metadata when _relay_metadata is set to: %s', async (_, _relay_metadata, expectMetadata) => {
      const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
      spy.mockResolvedValueOnce({ data: { price: 1000 } });
      const config = fixtures.buildConfig();
      const parameters = { _type: 'int256', _path: 'price', from: 'ETH', _relay_metadata };
      const aggregatedCall = fixtures.buildAggregatedApiCall({ parameters } as any);
      const [logs, res] = await callApi(config, aggregatedCall);
      expect(logs).toEqual([]);
      expect(res).toEqual({ value: '0x0000000000000000000000000000000000000000000000000000000005f5e100' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        {
          endpointName: 'convertToUSD',
          ois: fixtures.buildOIS(),
          parameters: {
            from: 'ETH',
            ...(expectMetadata && {
              _airnode_airnode_id: aggregatedCall.airnodeId,
              _airnode_client_address: aggregatedCall.clientAddress,
              _airnode_designated_wallet: aggregatedCall.designatedWallet,
              _airnode_endpoint_id: aggregatedCall.endpointId,
              _airnode_requester_index: aggregatedCall.requesterIndex,
              _airnode_request_id: aggregatedCall.id,
              _airnode_chain_type: aggregatedCall.chainId,
              _airnode_chain_id: config.chains[0].type,
              _airnode_airnode_rrp: config.chains[0].contracts.AirnodeRrp,
            }),
          },
          securitySchemeSecrets: [
            {
              securitySchemeName: 'My Security Scheme',
              value: 'supersecret',
            },
          ],
        },
        { timeout: 20000 }
      );
    });
  });

  it('returns an error if no _type parameter is found', async () => {
    const aggregatedCall = fixtures.buildAggregatedApiCall();
    const [logs, res] = await callApi(fixtures.buildConfig(), aggregatedCall);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: "No '_type' parameter was found for Endpoint:convertToUSD, OIS:Currency Converter API",
      },
    ]);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ReservedParametersInvalid,
    });
  });

  it('returns an error if the API call fails to execute', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockRejectedValueOnce(new Error('Network is down'));

    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedCall = fixtures.buildAggregatedApiCall({ parameters });
    const [logs, res] = await callApi(fixtures.buildConfig(), aggregatedCall);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to call Endpoint:convertToUSD', error: new Error('Network is down') },
    ]);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ApiCallFailed,
    });
  });

  it('returns an error if the value cannot be found with the _path', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedCall = fixtures.buildAggregatedApiCall({ parameters });
    const [logs, res] = await callApi(fixtures.buildConfig(), aggregatedCall);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to find response value from {"price":1000}. Path: unknown' },
    ]);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ResponseValueNotFound,
    });
  });
});
