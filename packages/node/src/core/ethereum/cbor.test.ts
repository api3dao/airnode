import * as cbor from './cbor';

describe('safeDecode', () => {
  it('decodes parameters successfully', () => {
    const res = cbor.safeDecode('0x636b6579a169736f6d657468696e676576616c7565');
    expect(res).toEqual({
      key: { something: 'value' },
    });
  });

  it('returns an empty object if parameters are empty', () => {
    const res = cbor.safeDecode('0x');
    expect(res).toEqual({});
  });

  it('returns an empty object if parameters are falsey', () => {
    const res = cbor.safeDecode('');
    expect(res).toEqual({});
  });

  it('returns null if the parameters cannot be decoded', () => {
    const res = cbor.safeDecode('1234');
    expect(res).toEqual(null);
  });
});
