import * as adapter from '@airnode/adapter';
import { ReservedParameterName } from '@airnode/ois';
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
    process.env.oisTitle_myapiApiScheme = 'supersecret';
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
    const aggregatedCall = fixtures.createAggregatedApiCall({ parameters });
    const [logs, res] = await callApi(fixtures.buildConfig(), aggregatedCall);
    expect(logs).toEqual([]);
    expect(res).toEqual({ value: '0x0000000000000000000000000000000000000000000000000000000005f5e100' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'convertToUsd',
        ois: fixtures.buildOIS(),
        parameters: { from: 'ETH' },
        securitySchemeSecrets: [
          {
            securitySchemeName: 'myapiApiScheme',
            value: 'supersecret',
          },
        ],
      },
      { timeout: 20000 }
    );
  });

  describe('with _relay_metadata set', () => {
    it.each([
      ['Includes', 'v1', true, undefined],
      ['Includes', 'V1', true, undefined],
      ['Includes', 'v2', false, { default: 'v1' }],
      ['Includes', 'v2', true, { fixed: 'v1' }],
      ['Does not include', 'version1', false, undefined],
      ['Does not include', '1', false, undefined],
      ['Does not include', '', false, undefined],
      ['Does not include', 'false', false, undefined],
      ['Does not include', undefined, false, undefined],
      ['Does not include', undefined, false, { default: '' }],
      ['Does not include', undefined, true, { default: 'v1' }],
    ])(
      '%s Airnode metadata when _relay_metadata is set to: %s',
      async (_, _relay_metadata, expectMetadata, parameterOptions) => {
        process.env.oisTitle_myapiApiScheme = 'supersecret';
        const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
        spy.mockResolvedValueOnce({ data: { price: 1000 } });
        const ois = fixtures.buildOIS();
        ois.endpoints[0].reservedParameters.push({
          name: ReservedParameterName.RelayMetadata,
          ...(parameterOptions ?? {}),
        });
        const config = fixtures.buildConfig({ ois: [ois] });
        const parameters = { _type: 'int256', _path: 'price', from: 'ETH', _relay_metadata };
        const aggregatedCall = fixtures.createAggregatedApiCall({ parameters } as any);
        const [logs, res] = await callApi(config, aggregatedCall);
        expect(logs).toEqual([]);
        expect(res).toEqual({ value: '0x0000000000000000000000000000000000000000000000000000000005f5e100' });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(
          {
            endpointName: 'convertToUsd',
            ois,
            parameters: {
              from: 'ETH',
              ...(expectMetadata && {
                _airnode_provider_id: aggregatedCall.providerId,
                _airnode_client_address: aggregatedCall.clientAddress,
                _airnode_designated_wallet: aggregatedCall.designatedWallet,
                _airnode_endpoint_id: aggregatedCall.endpointId,
                _airnode_requester_index: aggregatedCall.requesterIndex,
                _airnode_request_id: aggregatedCall.id,
                _airnode_chain_id: aggregatedCall.chainId,
                _airnode_chain_type: config.nodeSettings.chains[0].type,
                _airnode_airnode: config.nodeSettings.chains[0].contracts.Airnode,
              }),
            },
            securitySchemeSecrets: [
              {
                securitySchemeName: 'myapiApiScheme',
                value: 'supersecret',
              },
            ],
          },
          { timeout: 20000 }
        );
      }
    );
  });

  it('returns an error if no _type parameter is found', async () => {
    const aggregatedCall = fixtures.createAggregatedApiCall();
    const [logs, res] = await callApi(fixtures.buildConfig(), aggregatedCall);
    expect(logs).toEqual([
      { level: 'ERROR', message: "No '_type' parameter was found for Endpoint:convertToUsd, OIS:oisTitle" },
    ]);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ReservedParametersInvalid,
    });
  });

  it('returns an error if the API call fails to execute', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockRejectedValueOnce(new Error('Network is down'));

    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedCall = fixtures.createAggregatedApiCall({ parameters });
    const [logs, res] = await callApi(fixtures.buildConfig(), aggregatedCall);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to call Endpoint:convertToUsd', error: new Error('Network is down') },
    ]);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ApiCallFailed,
    });
  });

  it('returns an error if the value cannot be found with the _path', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedCall = fixtures.createAggregatedApiCall({ parameters });
    const [logs, res] = await callApi(fixtures.buildConfig(), aggregatedCall);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to find response value from {"price":1000}. Path: unknown' },
    ]);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ResponseValueNotFound,
    });
  });
});
