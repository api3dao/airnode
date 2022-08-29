const responseMock = jest.fn();
jest.mock('axios', () => responseMock);

import axios from 'axios';
import * as execution from './execution';
import { Request } from '../types';
import * as fixtures from '../../test/fixtures';

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
    const res = await execution.executeRequest(request);
    expect(res).toEqual({ value: '10000' });
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
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
    const res = await execution.executeRequest(request, { timeout: 12_999 });
    expect(res).toEqual({ value: '10000' });
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
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
    const res = await execution.executeRequest(request);
    expect(res).toEqual({ value: '10000' });
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
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
    const res = await execution.executeRequest(request, { timeout: 12_999 });
    expect(res).toEqual({ value: '10000' });
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
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
    const res = await execution.buildAndExecuteRequest(options);
    expect(res).toEqual({ value: '10000' });
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
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
    const res = await execution.buildAndExecuteRequest(options, { timeout: 3500 });
    expect(res).toEqual({ value: '7777' });
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
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
