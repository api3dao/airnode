import * as encoder from './encoder';

describe('convertNumberToBytes32', () => {
  it('converts positive numbers to bytes32', () => {
    expect(encoder.convertNumberToBytes32(777)).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000309'
    );
    expect(encoder.convertNumberToBytes32(1234567890)).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000499602d2'
    );
  });

  it('converts negative numbers to bytes32', () => {
    expect(encoder.convertNumberToBytes32(-777)).toEqual(
      '0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffcf7'
    );
    expect(encoder.convertNumberToBytes32(-1234567890)).toEqual(
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffb669fd2e'
    );
  });

  it('converts 0 to bytes32', () => {
    expect(encoder.convertNumberToBytes32(0)).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });
});

describe('convertStringToBytes32', () => {
  it('converts strings to bytes32', () => {
    expect(encoder.convertStringToBytes32('randomstring')).toEqual(
      '0x72616e646f6d737472696e670000000000000000000000000000000000000000'
    );
    expect(encoder.convertStringToBytes32('{"a":23}')).toEqual(
      '0x7b2261223a32337d000000000000000000000000000000000000000000000000'
    );
  });

  it('converts empty strings to bytes32', () => {
    expect(encoder.convertStringToBytes32('')).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });
});

describe('convertBoolToBytes32', () => {
  it('converts true to bytes32', () => {
    expect(encoder.convertBoolToBytes32(true)).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000001'
    );
  });

  it('converts false to bytes32', () => {
    expect(encoder.convertBoolToBytes32(false)).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });
});
