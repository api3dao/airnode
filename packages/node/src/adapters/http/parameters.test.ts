import { Endpoint } from '@airnode/ois';
import * as parameters from './parameters';

describe('RESERVED_PARAMETERS', () => {
  it('returns the list of reserved parameters', () => {
    expect(parameters.RESERVED_PARAMETERS).toEqual(['_path', '_times', '_type']);
  });
});

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
      ],
    };
  });

  it('returns the reserved parameter from the Endpoint first', () => {
    // This should be ignored
    const requestParameters = { _type: 'bytes32' };
    const res = parameters.getResponseParameterValue('_type', baseEndpoint, requestParameters);
    expect(res).toEqual('int256');
  });

  it('returns undefined if no reserved parameter exists', () => {
    const endpoint = { ...baseEndpoint, reservedParameters: [] };
    const requestParameters = { _type: 'bytes32' };
    const res = parameters.getResponseParameterValue('_type', endpoint, requestParameters);
    expect(res).toEqual(undefined);
  });

  it('returns the default if the request parameter does not exist', () => {
    const endpoint = { ...baseEndpoint };
    const res = parameters.getResponseParameterValue('_path', endpoint, {});
    expect(res).toEqual('prices.0.latest');
  });

  it('overrides the default if the request parameter exists', () => {
    const endpoint = { ...baseEndpoint };
    const requestParameters = { _path: 'new.path' };
    const res = parameters.getResponseParameterValue('_path', endpoint, requestParameters);
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
      ],
    };
  });

  it('fetches the response parameters', () => {
    const res = parameters.getResponseParameters(baseEndpoint, { _type: 'bytes32', _path: 'updated.path' });
    expect(res).toEqual({ _type: 'int256', _path: 'updated.path' });
  });
});
