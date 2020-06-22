jest.mock('axios', () => jest.fn());

import axios from 'axios';
import * as http from './http';

describe('get', () => {
  it('makes a GET request with the specified details', () => {
    const request = {
      url: 'https://example.com',
      auth: {
        username: 'username',
        password: 'password',
      },
      headers: { something: 'value' },
      timeout: 10_000,
    };
    http.get(request);

    expect(axios).toHaveBeenCalledWith({
      url: 'https://example.com',
      method: 'get',
      auth: {
        username: 'username',
        password: 'password',
      },
      headers: { something: 'value' },
      timeout: 10000,
    });
  });
});

describe('post', () => {
  it('makes a POST request with the specified details', () => {
    const request = {
      url: 'https://example.com',
      auth: {
        username: 'username',
        password: 'password',
      },
      headers: { something: 'value' },
      timeout: 10_000,
    };
    http.post(request);

    expect(axios).toHaveBeenCalledWith({
      url: 'https://example.com',
      method: 'post',
      auth: {
        username: 'username',
        password: 'password',
      },
      headers: { something: 'value' },
      timeout: 10000,
    });
  });
});
