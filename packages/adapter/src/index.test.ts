const responseMock = jest.fn();
jest.mock('axios', () => responseMock);

import axios from 'axios';
import { Request, ResponseParameters } from './types';
import * as fixtures from '../test/fixtures';
import * as adapter from './index';

describe('buildingRequest', () => {
  it('builds and returns the request', () => {
    const res = adapter.buildRequest(fixtures.getOptions());
    expect(res).toEqual({
      baseUrl: 'https://api.myapi.com',
      data: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      headers: {},
      method: 'get',
      path: '/convert',
    });
  });
});

describe('executeRequest', () => {
  it('executes simple GET requests', async () => {
    responseMock.mockResolvedValueOnce({ value: '10000' });

    const request: Request = {
      baseUrl: 'https://api.myapi.com',
      data: { from: 'ETH', to: 'USD' },
      headers: { api_key: 'supersecret' },
      method: 'get',
      path: '/convert',
    };
    const res = await adapter.executeRequest(request);
    expect(res).toEqual({ value: '10000' });

    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'https://api.myapi.com/convert',
      method: 'get',
      headers: { api_key: 'supersecret' },
      params: { from: 'ETH', to: 'USD' },
      timeout: 10_000,
    });
  });

  it('executes GET requests with config', async () => {
    responseMock.mockResolvedValueOnce({ value: '10000' });

    const request: Request = {
      baseUrl: 'https://api.myapi.com',
      data: { from: 'ETH', to: 'USD' },
      headers: { api_key: 'supersecret' },
      method: 'get',
      path: '/convert',
    };
    const res = await adapter.executeRequest(request, { timeout: 12_999 });
    expect(res).toEqual({ value: '10000' });

    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'https://api.myapi.com/convert',
      method: 'get',
      headers: { api_key: 'supersecret' },
      params: { from: 'ETH', to: 'USD' },
      timeout: 12_999,
    });
  });

  it('executes simple POST requests', async () => {
    responseMock.mockResolvedValueOnce({ value: '10000' });

    const request: Request = {
      baseUrl: 'https://api.myapi.com',
      data: { from: 'ETH', to: 'USD' },
      headers: { api_key: 'supersecret' },
      method: 'post',
      path: '/convert',
    };
    const res = await adapter.executeRequest(request);
    expect(res).toEqual({ value: '10000' });

    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'https://api.myapi.com/convert',
      method: 'post',
      headers: { api_key: 'supersecret' },
      data: { from: 'ETH', to: 'USD' },
      timeout: 10_000,
    });
  });

  it('executes POST requests with config', async () => {
    responseMock.mockResolvedValueOnce({ value: '10000' });

    const request: Request = {
      baseUrl: 'https://api.myapi.com',
      data: { from: 'ETH', to: 'USD' },
      headers: { api_key: 'supersecret' },
      method: 'post',
      path: '/convert',
    };
    const res = await adapter.executeRequest(request, { timeout: 12_999 });
    expect(res).toEqual({ value: '10000' });

    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'https://api.myapi.com/convert',
      method: 'post',
      headers: { api_key: 'supersecret' },
      data: { from: 'ETH', to: 'USD' },
      timeout: 12_999,
    });
  });
});

describe('buildAndExecuteRequest', () => {
  it('builds and executes the request', async () => {
    responseMock.mockResolvedValueOnce({ value: '10000' });

    const res = await adapter.buildAndExecuteRequest(fixtures.getOptions());
    expect(res).toEqual({ value: '10000' });

    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'https://api.myapi.com/convert',
      method: 'get',
      headers: {},
      params: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      timeout: 10_000,
    });
  });

  it('builds and executes the request with optional config', async () => {
    responseMock.mockResolvedValueOnce({ value: '7777' });

    const res = await adapter.buildAndExecuteRequest(fixtures.getOptions(), { timeout: 3500 });
    expect(res).toEqual({ value: '7777' });

    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'https://api.myapi.com/convert',
      method: 'get',
      headers: {},
      params: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      timeout: 3500,
    });
  });
});

describe('extractAndEncodeValue', () => {
  it('returns a simple value with the encodedValue', () => {
    const res = adapter.extractAndEncodeResponse('simplestring', { _type: 'bytes32' });
    expect(res).toEqual({
      value: 'simplestring',
      encodedValue: '0x73696d706c65737472696e670000000000000000000000000000000000000000',
    });
  });

  it('extracts and encodes the value from complex objects', () => {
    const data = { a: { b: [{ c: 1 }, { d: '750.51' }] } };
    const parameters: ResponseParameters = { _path: 'a.b.1.d', _type: 'int256', _times: 100 };
    const res = adapter.extractAndEncodeResponse(data, parameters);
    expect(res).toEqual({
      value: 75051,
      encodedValue: '0x000000000000000000000000000000000000000000000000000000000001252b',
    });
  });
});

describe('re-exported functions', () => {
  it('exports isNumberType()', () => {
    expect(adapter.isNumberType('bytes32')).toEqual(false);
    expect(adapter.isNumberType('bool')).toEqual(false);
    expect(adapter.isNumberType('int256')).toEqual(true);
  });

  it('exports processByExtracting', () => {
    const data = { a: { b: [{ c: 1 }, { d: 5 }] } };
    const res = adapter.processByExtracting(data, 'a.b.1.d');
    expect(res).toEqual(5);
  });

  it('exports processByCasting', () => {
    expect(adapter.processByCasting('true', 'bool')).toEqual(true);
    expect(adapter.processByCasting('777', 'int256')).toEqual(777);
    expect(adapter.processByCasting('BTC_USD', 'bytes32')).toEqual('BTC_USD');
  });

  it('exports multiplyValue', () => {
    const res = adapter.processByMultiplying(7.789, 1000);
    expect(res).toEqual(7789);
  });

  it('exports encodedValue', () => {
    const res = adapter.processByEncoding('random string', 'bytes32');
    expect(res).toEqual('0x72616e646f6d20737472696e6700000000000000000000000000000000000000');
  });
});
