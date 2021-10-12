import { ethers } from 'ethers';
import * as encoding from './encoding';

describe('convertUnsignedInteger', () => {
  it('converts positive numbers to bytes32', () => {
    expect(encoding.convertUnsignedInteger('777')).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000309'
    );
    expect(encoding.convertUnsignedInteger('1234567890')).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000499602d2'
    );
  });

  it('converts very large numbers to bytes32', () => {
    expect(
      encoding.convertUnsignedInteger('115792089237316195423570985008687907853269984665640564039457584007913129639935')
    ).toEqual('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  });

  it('converts 0 to bytes32', () => {
    expect(encoding.convertUnsignedInteger('0')).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  it('throws if attempting to convert a negative number', () => {
    expect(() => {
      encoding.convertUnsignedInteger('-777');
    }).toThrowError();
  });

  it('throws if attempting to convert a decimal number', () => {
    expect(() => {
      encoding.convertUnsignedInteger('12.3');
    }).toThrowError();
  });
});

describe('convertSignedInteger', () => {
  it('converts positive numbers to bytes32', () => {
    expect(encoding.convertSignedInteger('777')).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000309'
    );
    expect(encoding.convertSignedInteger('1234567890')).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000499602d2'
    );
  });

  it('converts negative numbers to bytes32', () => {
    expect(encoding.convertSignedInteger('-777')).toEqual(
      '0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffcf7'
    );
    expect(encoding.convertSignedInteger('-1234567890')).toEqual(
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffb669fd2e'
    );
  });

  it('converts very large numbers to bytes32', () => {
    expect(encoding.convertSignedInteger('12839712893719823718973198273537864783642')).toEqual(
      '0x00000000000000000000000000000025bb86c101e22b4eda9326a6e67b9e571a'
    );
  });

  it('converts 0 to bytes32', () => {
    expect(encoding.convertSignedInteger('0')).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  it('throws if attempting to convert a decimal number', () => {
    expect(() => {
      encoding.convertSignedInteger('12.3');
    }).toThrowError();
  });
});

describe('convertString', () => {
  it('truncates strings 31 chracters or longer', () => {
    const longString = 'a string with more than 31 characters';
    const exactString = 'x'.repeat(31);

    // Double check length
    expect(exactString.length).toEqual(31);

    const longEncoded = encoding.convertString(longString);
    const exactEncoded = encoding.convertString(exactString);

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
    expect(encoding.convertString('randomstring')).toEqual(
      '0x72616e646f6d737472696e670000000000000000000000000000000000000000'
    );
    expect(encoding.convertString('{"a":23}')).toEqual(
      '0x7b2261223a32337d000000000000000000000000000000000000000000000000'
    );
  });

  it('converts empty strings to bytes32', () => {
    expect(encoding.convertString('')).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');
  });
});

describe('convertBool', () => {
  it('converts true to bytes32', () => {
    expect(encoding.convertBool(true)).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001');
  });

  it('converts false to bytes32', () => {
    expect(encoding.convertBool(false)).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');
  });
});

describe('encodeValue', () => {
  it('encodes int256 values', () => {
    expect(encoding.encodeValue('1234567890', 'int256')).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000499602d2'
    );
  });

  it('encodes bool values', () => {
    expect(encoding.encodeValue(true, 'bool')).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000001'
    );
  });

  it('encodes bytes32 values', () => {
    expect(encoding.encodeValue('randomstring', 'bytes32')).toEqual(
      '0x72616e646f6d737472696e670000000000000000000000000000000000000000'
    );
  });
});
