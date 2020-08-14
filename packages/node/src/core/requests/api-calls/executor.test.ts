jest.mock('../../config', () => ({
  config: {
    ois: [
      {
        title: 'my-api',
        endpoints: [
          {
            name: 'my-endpoint',
            reservedParameters: [],
          },
        ],
      },
    ],
  },
  security: {
    apiCredentials: {
      'my-api': [{ securitySchemeName: 'scheme-1', value: 'supersecret' }],
    },
  },
}));

import * as adapter from '@airnode/adapter';
import * as executor from './executor';
import { RequestErrorCode } from 'src/types';

describe('callApi', () => {
  it('calls the adapter with the given parameters', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ body: { price: 1000 } });

    const callOptions: executor.CallOptions = {
      oisTitle: 'my-api',
      endpointName: 'my-endpoint',
      parameters: { _type: 'int256', _path: 'price', from: 'ETH' },
    };
    const res = await executor.callApi(callOptions);
    expect(res).toEqual('0x00000000000000000000000000000000000000000000000000000000000003e8');
  });

  it('returns an error if the OIS is not found', async () => {
    const callOptions: executor.CallOptions = {
      oisTitle: 'unknown-api',
      endpointName: 'my-endpoint',
      parameters: {},
    };
    const res = await executor.callApi(callOptions);
    expect(res).toEqual({
      errorCode: RequestErrorCode.InvalidOIS,
      message: 'OIS:unknown-api was not found',
    });
  });

  it('returns an error if the endpoint is not found', async () => {
    const callOptions: executor.CallOptions = {
      oisTitle: 'my-api',
      endpointName: 'unknown-endpoint',
      parameters: {},
    };
    const res = await executor.callApi(callOptions);
    expect(res).toEqual({
      errorCode: RequestErrorCode.InvalidOIS,
      message: 'Endpoint:unknown-endpoint was not found in OIS:my-api',
    });
  });

  it('returns an error if no _type parameter is found', async () => {
    const callOptions: executor.CallOptions = {
      oisTitle: 'my-api',
      endpointName: 'my-endpoint',
      parameters: {},
    };
    const res = await executor.callApi(callOptions);
    expect(res).toEqual({
      errorCode: RequestErrorCode.InvalidResponseParameters,
      message: "No '_type' parameter was found for Endpoint:my-endpoint, OIS:my-api",
    });
  });

  it('returns an error if the API call fails to execute', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockRejectedValueOnce(new Error('Network is down'));

    const callOptions: executor.CallOptions = {
      oisTitle: 'my-api',
      endpointName: 'my-endpoint',
      parameters: { _type: 'int256', _path: 'unknown', from: 'ETH' },
    };
    const res = await executor.callApi(callOptions);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ApiCallFailed,
      message: 'Failed to call Endpoint:my-endpoint. Error: Network is down',
    });
  });

  it('returns an error if the value cannot be found with the _path', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ body: { price: 1000 } });

    const callOptions: executor.CallOptions = {
      oisTitle: 'my-api',
      endpointName: 'my-endpoint',
      parameters: { _type: 'int256', _path: 'unknown', from: 'ETH' },
    };
    const res = await executor.callApi(callOptions);
    expect(res).toEqual({
      errorCode: RequestErrorCode.ResponseValueNotFound,
      message: 'Unable to find response value from {"price":1000}. Path: unknown',
    });
  });
});
