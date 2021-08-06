import { Endpoint, ReservedParameterName } from '@api3/ois';
import * as parameters from './parameters';

describe('RESERVED_PARAMETERS', () => {
  it('returns the list of reserved parameters', () => {
    expect(parameters.RESERVED_PARAMETERS).toEqual(['_path', '_times', '_type', '_relay_metadata']);
  });
});

describe('getResponseParameterValue', () => {
  let mutableBaseEndpoint: Endpoint;

  beforeEach(() => {
    mutableBaseEndpoint = {
      fixedOperationParameters: [],
      name: 'fetch-price',
      operation: { method: 'get', path: '/prices/latest' },
      parameters: [],
      reservedParameters: [
        { name: ReservedParameterName.Type, fixed: 'int256' },
        { name: ReservedParameterName.Path, default: 'prices.0.latest' },
      ],
    };
  });

  it('returns the reserved parameter from the Endpoint first', () => {
    // This should be ignored
    const requestParameters = { _type: 'bytes32' };
    const res = parameters.getReservedParameterValue(
      ReservedParameterName.Type,
      mutableBaseEndpoint,
      requestParameters
    );
    expect(res).toEqual('int256');
  });

  it('returns undefined if no reserved parameter exists', () => {
    const endpoint = { ...mutableBaseEndpoint, reservedParameters: [] };
    const requestParameters = { _type: 'bytes32' };
    const res = parameters.getReservedParameterValue(ReservedParameterName.Type, endpoint, requestParameters);
    expect(res).toEqual(undefined);
  });

  it('returns the default if the request parameter does not exist', () => {
    const endpoint = { ...mutableBaseEndpoint };
    const res = parameters.getReservedParameterValue(ReservedParameterName.Path, endpoint, {});
    expect(res).toEqual('prices.0.latest');
  });

  it('overrides the default if the request parameter exists', () => {
    const endpoint = { ...mutableBaseEndpoint };
    const requestParameters = { _path: 'new.path' };
    const res = parameters.getReservedParameterValue(ReservedParameterName.Path, endpoint, requestParameters);
    expect(res).toEqual('new.path');
  });
});

describe('getReservedParameters', () => {
  let mutableBaseEndpoint: Endpoint;

  beforeEach(() => {
    mutableBaseEndpoint = {
      fixedOperationParameters: [],
      name: 'fetch-price',
      operation: { method: 'get', path: '/prices/latest' },
      parameters: [],
      reservedParameters: [
        { name: ReservedParameterName.Type, fixed: 'int256' },
        { name: ReservedParameterName.Path, default: 'prices.0.latest' },
        { name: ReservedParameterName.Times, default: '1000000' },
        { name: ReservedParameterName.RelayMetadata, default: 'v1' },
      ],
    };
  });

  it('fetches the response parameters', () => {
    const res = parameters.getReservedParameters(mutableBaseEndpoint, {
      _type: 'bytes32',
      _path: 'updated.path',
      _relay_metadata: 'v2',
    });
    expect(res).toEqual({ _type: 'int256', _path: 'updated.path', _times: '1000000', _relay_metadata: 'v2' });
  });
});
