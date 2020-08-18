jest.mock('../config', () => ({
  config: {
    ois: [
      {
        title: 'oisTitle',
        endpoints: [
          {
            name: 'endpointName',
            reservedParameters: [
              { name: '_path', default: 'prices.0.latest' }
            ],
          },
        ],
      },
    ],
  },
  security: {
    apiCredentials: {
      'oisTitle': [{ securitySchemeName: 'scheme-1', value: 'supersecret' }],
    },
  },
}));

import * as adapter from '@airnode/adapter';
import * as fixtures from 'test/fixtures';
import * as executor from './executor';
import { RequestErrorCode } from 'src/types';

describe('callApi', () => {
  it('calls the adapter with the given parameters', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });

    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
    const aggregatedCall = fixtures.createAggregatedApiCall({ parameters });
    const res = await executor.callApi(aggregatedCall);
    expect(res).toEqual({ value: '0x00000000000000000000000000000000000000000000000000000000000003e8' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'endpointName',
        ois: {
          endpoints: [
            {
              name: 'endpointName',
              reservedParameters: [{ name: '_path', default: 'prices.0.latest' }],
            },
          ],
          title: 'oisTitle',
        },
        parameters: { from: 'ETH' },
        securitySchemes: [{ securitySchemeName: 'scheme-1', value: 'supersecret' }],
      },
      { timeout: 20000 }
    );
  });

  it('returns an error if the OIS is not found', async () => {
    const aggregatedCall = fixtures.createAggregatedApiCall({ oisTitle: 'unknownOis' });
    const res = await executor.callApi(aggregatedCall);
    expect(res).toEqual({
      errorCode: RequestErrorCode.InvalidOIS,
      message: 'OIS:unknownOis not found for Request:apiCallId',
    });
  });

  it('returns an error if the endpoint is not found', async () => {
    const aggregatedCall = fixtures.createAggregatedApiCall({ endpointName: 'unknownEndpoint' });
    const res = await executor.callApi(aggregatedCall);
    expect(res).toEqual({
      errorCode: RequestErrorCode.InvalidOIS,
      message: 'Endpoint:unknownEndpoint not found in OIS:oisTitle for Request:apiCallId',
    });
  });

  it('returns an error if no _type parameter is found', async () => {
    const aggregatedCall = fixtures.createAggregatedApiCall();
    const res = await executor.callApi(aggregatedCall);
    expect(res).toEqual({
      errorCode: RequestErrorCode.InvalidResponseParameters,
      message: "No '_type' parameter was found for Endpoint:endpointName, OIS:oisTitle",
    });
  });

  it('returns an error if the API call fails to execute', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockRejectedValueOnce(new Error('Network is down'));

    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedCall = fixtures.createAggregatedApiCall({ parameters });
    const res = await executor.callApi(aggregatedCall);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ApiCallFailed,
      message: 'Failed to call Endpoint:endpointName. Error: Network is down',
    });
  });

  it('returns an error if the value cannot be found with the _path', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });

    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedCall = fixtures.createAggregatedApiCall({ parameters });
    const res = await executor.callApi(aggregatedCall);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ResponseValueNotFound,
      message: 'Unable to find response value from {"price":1000}. Path: unknown',
    });
  });
});
