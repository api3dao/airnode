const responseMock = jest.fn();
jest.mock('axios', () => responseMock);

import axios from 'axios';
import { Request, ResponseParameters } from './types';
import * as fixtures from '../test/__fixtures__';
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

describe('adapter - extractResponse', () => {
  it('returns the data as is if no path is provided', () => {
    const res = adapter.extractResponse('simplestring', { type: 'bytes32' });
    expect(res).toEqual('simplestring');
  });

  it('extracts the value from the path from complex objects', () => {
    const data = { a: { b: [{ c: 1 }, { d: '5' }] } };
    const parameters: ResponseParameters = { path: 'a.b.1.d', type: 'int256' };
    const res = adapter.extractResponse(data, parameters);
    expect(res).toEqual('5');
  });

  it('throws an error if unable to find the value from the path', () => {
    const parameters: ResponseParameters = { path: 'b', type: 'bytes32' };
    expect(() => {
      adapter.extractResponse({ a: 1 }, parameters);
    }).toThrowError(new Error("Unable to find value from path: 'b'"));
  });
});

describe('adapter - castResponse', () => {
  it('casts simple strings', () => {
    const res = adapter.castResponse('somestring', { type: 'bytes32' });
    expect(res).toEqual('somestring');
  });

  it('casts simple numbers', () => {
    const res = adapter.castResponse(777.77, { type: 'int256', times: 100 });
    expect(res).toEqual(77777);
  });

  it('multiplies number values by the times', () => {
    const parameters: ResponseParameters = { type: 'int256', times: 1000 };
    const res = adapter.castResponse(7.789, parameters);
    expect(res).toEqual(7789);
  });
});

describe('extractAndCastResponse', () => {
  it('extracts and casts the value from the path from complex objects', () => {
    const data = { a: { b: [{ c: 1 }, { d: '5.55' }] } };
    const parameters: ResponseParameters = { path: 'a.b.1.d', type: 'int256', times: 1000 };
    const res = adapter.extractAndCastResponse(data, parameters);
    expect(res).toEqual(5550);
  });

  it('throws an error if unable to find the value from the path', () => {
    const parameters: ResponseParameters = { path: 'b', type: 'bytes32' };
    expect(() => {
      adapter.extractAndCastResponse({ a: 1 }, parameters);
    }).toThrowError(new Error("Unable to find value from path: 'b'"));
  });
});
