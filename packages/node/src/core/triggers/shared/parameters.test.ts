import * as parameters from './parameters';

describe('initialize ApiCall BaseRequest', () => {
  it('decodes parameters successfully', () => {
    const res = parameters.tryDecodeParameters('0x636b6579a169736f6d657468696e676576616c7565');
    expect(res).toEqual({
      key: { something: 'value' },
    });
  });

  it('returns an empty object if parameters are empty', () => {
    const res = parameters.tryDecodeParameters('0x');
    expect(res).toEqual({});
  });

  it('returns an empty object if parameters are falsey', () => {
    const res = parameters.tryDecodeParameters('');
    expect(res).toEqual({});
  });

  it('returns null if the parameters cannot be decoded', () => {
    const res = parameters.tryDecodeParameters('1234');
    expect(res).toEqual(null);
  });
});
