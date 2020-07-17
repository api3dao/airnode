import { State } from '../types';
import { initialize as initializeState } from '../state';
import * as fixtures from '../../test/__fixtures__';
import * as requestBuilder from './index';

describe('build', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(fixtures.getOptions());
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
