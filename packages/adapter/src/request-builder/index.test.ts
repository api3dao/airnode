import { Options, State } from '../types';
import { initialize as initializeState } from '../state';
import * as fixtures from '../../test/__fixtures__';
import * as requestBuilder from './index';

describe('build', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(getOptions());
  });

  it('builds and returns the request', () => {
    const res = requestBuilder.build(state);
    expect(res).toEqual({
      baseUrl: 'https://api.myapi.com',
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

function getOptions(): Options {
  const options: Options = {
    ois: fixtures.ois,
    endpointName: 'convertToUsd',
    parameters: { f: 'ETH', amount: '1' },
    securitySchemes: fixtures.securitySchemes,
  };
  // Get a fresh clone to prevent updating references between tests
  return JSON.parse(JSON.stringify(options));
}
