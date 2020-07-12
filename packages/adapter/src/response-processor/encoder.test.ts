import { ethers } from 'ethers';
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
  it('truncates strings 31 chracters or longer', () => {
    const longString = 'a string with more than 31 characters';
    const exactString = 'x'.repeat(31);

    // Double check length
    expect(exactString.length).toEqual(31);

    const longEncoded = encoder.convertStringToBytes32(longString);
    const exactEncoded = encoder.convertStringToBytes32(exactString);

    expect(longEncoded).toEqual('0x6120737472696e672077697468206d6f7265207468616e203331206368617200');
    expect(exactEncoded).toEqual('0x7878787878787878787878787878787878787878787878787878787878787800');

    const parsedLong = ethers.utils.parseBytes32String(longEncoded);
    expect(parsedLong.length).toEqual(31);
    expect(parsedLong).toEqual('a string with more than 31 char');

    const parsedExact = ethers.utils.parseBytes32String(exactEncoded);
    expect(parsedExact.length).toEqual(31);
    expect(parsedExact).toEqual('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  });

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
