jest.mock('axios', () => jest.fn());

import axios from 'axios';
import * as http from './http';
import { Request } from '../types';

describe('get', () => {
  it('makes a GET request with the specified details', () => {
    const request: Request = {
      baseUrl: 'https://example.com',
      path: '/convert',
      method: 'get',
      data: { from: 'ETH', to: 'USD' },
      headers: { something: 'value' },
    };
    http.get(request);

    expect(axios).toHaveBeenCalledWith({
      url: 'https://example.com/convert',
      method: 'get',
      params: { from: 'ETH', to: 'USD' },
      headers: { something: 'value' },
    });
  });
});

describe('post', () => {
  it('makes a POST request with the specified details', () => {
    const request: Request = {
      baseUrl: 'https://example.com',
      path: '/convert',
      method: 'post',
      data: { from: 'ETH', to: 'USD' },
      headers: { something: 'value' },
    };
    http.post(request);

    expect(axios).toHaveBeenCalledWith({
      url: 'https://example.com/convert',
      method: 'post',
      data: { from: 'ETH', to: 'USD' },
      params: undefined,
      headers: { something: 'value' },
    });
  });
});
