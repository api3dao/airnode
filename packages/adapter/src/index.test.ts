const responseMock = jest.fn();
jest.mock('axios', () => responseMock);

import axios from 'axios';
import { Request, ResponseParameters } from './types';
import * as fixtures from '../test/fixtures';
import * as adapter from './index';

describe('buildingRequest', () => {
  it('builds and returns the request', () => {
    const options = fixtures.buildRequestOptions();
    const res = adapter.buildRequest(options);
    expect(res).toEqual({
      baseUrl: 'http://localhost:5000',
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
      baseUrl: 'http://localhost:5000',
      data: { from: 'ETH', to: 'USD' },
      headers: { api_key: 'supersecret' },
      method: 'get',
      path: '/convert',
    };
    const res = await adapter.executeRequest(request);
    expect(res).toEqual({ value: '10000' });
    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'http://localhost:5000/convert',
      method: 'get',
      headers: { api_key: 'supersecret' },
      params: { from: 'ETH', to: 'USD' },
    });
  });

  it('executes GET requests with config', async () => {
    responseMock.mockResolvedValueOnce({ value: '10000' });
    const request: Request = {
      baseUrl: 'http://localhost:5000',
      data: { from: 'ETH', to: 'USD' },
      headers: { api_key: 'supersecret' },
      method: 'get',
      path: '/convert',
    };
    const res = await adapter.executeRequest(request, { timeout: 12_999 });
    expect(res).toEqual({ value: '10000' });
    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'http://localhost:5000/convert',
      method: 'get',
      headers: { api_key: 'supersecret' },
      params: { from: 'ETH', to: 'USD' },
      timeout: 12_999,
    });
  });

  it('executes simple POST requests', async () => {
    responseMock.mockResolvedValueOnce({ value: '10000' });
    const request: Request = {
      baseUrl: 'http://localhost:5000',
      data: { from: 'ETH', to: 'USD' },
      headers: { api_key: 'supersecret' },
      method: 'post',
      path: '/convert',
    };
    const res = await adapter.executeRequest(request);
    expect(res).toEqual({ value: '10000' });
    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'http://localhost:5000/convert',
      method: 'post',
      headers: { api_key: 'supersecret' },
      data: { from: 'ETH', to: 'USD' },
    });
  });

  it('executes POST requests with config', async () => {
    responseMock.mockResolvedValueOnce({ value: '10000' });
    const request: Request = {
      baseUrl: 'http://localhost:5000',
      data: { from: 'ETH', to: 'USD' },
      headers: { api_key: 'supersecret' },
      method: 'post',
      path: '/convert',
    };
    const res = await adapter.executeRequest(request, { timeout: 12_999 });
    expect(res).toEqual({ value: '10000' });
    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'http://localhost:5000/convert',
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
    const options = fixtures.buildRequestOptions();
    const res = await adapter.buildAndExecuteRequest(options);
    expect(res).toEqual({ value: '10000' });
    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'http://localhost:5000/convert',
      method: 'get',
      headers: {},
      params: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
    });
  });

  it('builds and executes the request with optional config', async () => {
    responseMock.mockResolvedValueOnce({ value: '7777' });
    const options = fixtures.buildRequestOptions();
    const res = await adapter.buildAndExecuteRequest(options, { timeout: 3500 });
    expect(res).toEqual({ value: '7777' });
    expect(axios).toBeCalledTimes(1);
    expect(axios).toBeCalledWith({
      url: 'http://localhost:5000/convert',
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
    const parameters: ResponseParameters = { _path: 'a.b.1.d', _type: 'int256', _times: '100' };
    const res = adapter.extractAndEncodeResponse(data, parameters);
    expect(res).toEqual({
      value: '75051',
      encodedValue: '0x000000000000000000000000000000000000000000000000000000000001252b',
    });
  });
});
