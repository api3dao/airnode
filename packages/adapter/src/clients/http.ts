import axios, { AxiosRequestConfig } from 'axios';

function request(config: AxiosRequestConfig) {
  return axios({
    url: config.url,
    method: config.method,
    auth: config.auth,
    headers: config.headers,
    timeout: config.timeout,
  });
}

export function get(config: AxiosRequestConfig) {
  return request({ ...config, method: 'get' });
}

export function post(config: AxiosRequestConfig) {
  return request({ ...config, method: 'post' });
}
