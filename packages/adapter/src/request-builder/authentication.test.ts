import { Options, State } from '../types';
import { initialize as initializeState } from '../state';
import * as fixtures from './__fixtures__';
import * as authentication from './authentication';

const options: Options = {
  method: 'get',
  ois: fixtures.ois,
  oracleSpecName: 'convertToUsd',
  path: '/convert',
  parameters: {
    f: 'ETH',
    amount: '1',
  },
  securitySchemes: fixtures.securitySchemes,
};

describe('building empty parameters', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(options);
  });

  it('returns no parameters if secret securitySchemes is empty', () => {
    state.securitySchemes = undefined;
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      headers: {},
      query: {},
      cookies: {},
    });
  });

  it('returns no parameters if API securitySchemes is empty', () => {
    state.ois.apiSpecifications.components.securitySchemes = {};
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      headers: {},
      query: {},
      cookies: {},
    });
  });
});

describe('building API key parameters', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(options);
  });

  it('returns the API key in the query', () => {
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: { access_key: 'super-secret-key' },
      headers: {},
      cookies: {},
    });
  });
});
