import { Endpoint } from '@airnode/ois';
import * as response from './response';

describe('getResponseParameterValue', () => {
  let baseEndpoint: Endpoint;

  beforeEach(() => {
    baseEndpoint = {
      fixedOperationParameters: [],
      name: 'fetch-price',
      operation: { method: 'get', path: '/prices/latest' },
      parameters: [],
      reservedParameters: [
        { name: '_type', fixed: 'int256' },
        { name: '_path', default: 'prices.0.latest' },
      ]
    };
  });

  it('returns the reserved parameter from the Endpoint first', () => {
    const endpoint = { ...baseEndpoint };
    // This should be ignored
    const parameters = { _type: 'bytes32' };
    const res = response.getResponseParameterValue('_type', endpoint, parameters);
    expect(res).toEqual('int256');
  });

  it('returns the request parameter from the Endpoint if no reserved parameter exists', () => {
    const endpoint = { ...baseEndpoint, reservedParameters: [] };
    const parameters = { _type: 'bytes32' };
    const res = response.getResponseParameterValue('_type', endpoint, parameters);
    expect(res).toEqual('bytes32');
  });

  it('returns the default if the request parameter does not exist', () => {
    const endpoint = { ...baseEndpoint };
    const res = response.getResponseParameterValue('_path', endpoint, {});
    expect(res).toEqual('prices.0.latest');
  });

  it('overrides the default if the request parameter exists', () => {
    const endpoint = { ...baseEndpoint };
    const parameters = { _path: 'new.path' };
    const res = response.getResponseParameterValue('_path', endpoint, parameters);
    expect(res).toEqual('new.path');
  });
});

describe('getResponseParameters', () => {
  let baseEndpoint: Endpoint;

  beforeEach(() => {
    baseEndpoint = {
      fixedOperationParameters: [],
      name: 'fetch-price',
      operation: { method: 'get', path: '/prices/latest' },
      parameters: [],
      reservedParameters: [
        { name: '_type', fixed: 'int256' },
        { name: '_path', default: 'prices.0.latest' },
      ]
    };
  });

  it('fetches the response parameters', () => {
    const res = response.getResponseParameters(baseEndpoint, { _type: 'bytes32', _path: 'updated.path' });
    expect(res).toEqual({ _type: 'int256', _path: 'updated.path' });
  });

  it('converts _times to a number', () => {
    const res = response.getResponseParameters(baseEndpoint, {
      _type: 'bytes32',
      _path: 'updated.path',
      _times: '1000000',
    });
    expect(res).toEqual({ _type: 'int256', _path: 'updated.path', _times: 1000000 });
  });
});
