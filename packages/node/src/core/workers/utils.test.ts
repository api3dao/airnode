import * as utils from './utils';

describe('isLocalEnv', () => {
  it('returns true for local providers', () => {
    expect(utils.isLocalEnv('local:aws')).toEqual(true);
  });

  it('returns false for remote cloud providers', () => {
    expect(utils.isLocalEnv('aws')).toEqual(false);
  });
});
