import * as stringUtils from './string-utils';

describe('randomString', () => {
  it('returns the hex value for random string of X bytes', () => {
    expect(stringUtils.randomString(12)).toHaveLength(24);
  });
});
