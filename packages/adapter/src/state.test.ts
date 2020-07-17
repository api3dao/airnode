import * as state from './state';
import * as fixtures from '../test/__fixtures__';

describe('initialize', () => {
  it('caches the operation to use', () => {
    const res = state.initialize(fixtures.getOptions());
    expect(res.operation).toEqual({
      parameters: [
        { in: 'query', name: 'from' },
        { in: 'query', name: 'to' },
        { in: 'query', name: 'amount' },
        { in: 'query', name: 'date' },
      ],
    });
  });

  it('sets the endpoint based on the endpointName', () => {
    const res = state.initialize(fixtures.getOptions());
    expect(res.endpoint.name).toEqual('convertToUsd');
  });

  it('throws an error if unable to find the endpoint', () => {
    expect(() => {
      const options = { ...fixtures.getOptions(), endpointName: 'unknown' };
      state.initialize(options);
    }).toThrowError(new Error("Endpoint: 'unknown' not found in the OIS."));
  });
});
