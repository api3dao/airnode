import * as stringUtils from './string';

describe('randomHexString', () => {
  it('returns the hex value of length X', () => {
    expect(stringUtils.randomHexString(24)).toHaveLength(24);
  });

  it('throws on odd length', () => {
    expect(() => stringUtils.randomHexString(11)).toThrow('Expected length to be even. It was: 11');
  });
});
