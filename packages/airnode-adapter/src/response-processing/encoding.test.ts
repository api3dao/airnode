import { ethers } from 'ethers';
import * as encoding from './encoding';

describe('convertUnsignedInteger', () => {
  it('converts positive numbers', () => {
    expect(encoding.convertUnsignedInteger('777')).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000309'
    );
    expect(encoding.convertUnsignedInteger('1234567890')).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000499602d2'
    );
  });

  it('converts very large numbers', () => {
    expect(
      encoding.convertUnsignedInteger('115792089237316195423570985008687907853269984665640564039457584007913129639935')
    ).toEqual('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  });

  it('converts 0', () => {
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
  it('converts positive numbers', () => {
    expect(encoding.convertSignedInteger('777')).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000309'
    );
    expect(encoding.convertSignedInteger('1234567890')).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000499602d2'
    );
  });

  it('converts negative numbers', () => {
    expect(encoding.convertSignedInteger('-777')).toEqual(
      '0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffcf7'
    );
    expect(encoding.convertSignedInteger('-1234567890')).toEqual(
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffb669fd2e'
    );
  });

  it('converts very large numbers', () => {
    expect(encoding.convertSignedInteger('12839712893719823718973198273537864783642')).toEqual(
      '0x00000000000000000000000000000025bb86c101e22b4eda9326a6e67b9e571a'
    );
  });

  it('converts 0', () => {
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

describe('convertBytes32', () => {
  it('truncates strings 31 chracters or longer', () => {
    const longString = 'a string with more than 31 characters';
    const exactString = 'x'.repeat(31);

    // Double check length
    expect(exactString.length).toEqual(31);

    const longEncoded = encoding.convertBytes32(longString);
    const exactEncoded = encoding.convertBytes32(exactString);

    expect(longEncoded).toEqual('0x6120737472696e672077697468206d6f7265207468616e203331206368617200');
    expect(exactEncoded).toEqual('0x7878787878787878787878787878787878787878787878787878787878787800');

    const parsedLong = ethers.utils.parseBytes32String(longEncoded);
    expect(parsedLong.length).toEqual(31);
    expect(parsedLong).toEqual('a string with more than 31 char');

    const parsedExact = ethers.utils.parseBytes32String(exactEncoded);
    expect(parsedExact.length).toEqual(31);
    expect(parsedExact).toEqual('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  });

  it('converts strings', () => {
    expect(encoding.convertBytes32('randomstring')).toEqual(
      '0x72616e646f6d737472696e670000000000000000000000000000000000000000'
    );
    expect(encoding.convertBytes32('{"a":23}')).toEqual(
      '0x7b2261223a32337d000000000000000000000000000000000000000000000000'
    );
  });

  it('converts empty strings', () => {
    expect(encoding.convertBytes32('')).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');
  });
});

describe('convertBool', () => {
  it('converts true', () => {
    expect(encoding.convertBool(true)).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001');
  });

  it('converts false', () => {
    expect(encoding.convertBool(false)).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');
  });
});

describe('convertAddress', () => {
  it('converts a valid address', () => {
    expect(encoding.convertAddress('0x8f0633d80Be1EA5B5DF1909b64f2573622290576')).toEqual(
      '0x0000000000000000000000008f0633d80be1ea5b5df1909b64f2573622290576'
    );
  });

  it('throws on invalid address', () => {
    expect(() => encoding.convertAddress('0xInvalid')).toThrow('invalid address');
  });
});

describe('convertBytes', () => {
  it('converts a bytes string', () => {
    const { hexlify, arrayify, toUtf8String, toUtf8Bytes, defaultAbiCoder } = ethers.utils;
    const exampleString = 'this is an example string that is a bit longer';
    const bytesString = hexlify(toUtf8Bytes(exampleString));
    expect(bytesString).toBe(
      '0x7468697320697320616e206578616d706c6520737472696e672074686174206973206120626974206c6f6e676572'
    );

    const encoded = encoding.convertBytes(bytesString);
    expect(encoded).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002e7468697320697320616e206578616d706c6520737472696e672074686174206973206120626974206c6f6e676572000000000000000000000000000000000000'
    );

    // This part will be decoded on chain using the abi
    const abiDecoded = defaultAbiCoder.decode(['bytes'], encoded)[0];
    const decoded = toUtf8String(arrayify(abiDecoded)).toString();
    expect(decoded).toBe(exampleString);
  });

  it('throws on non "hex string" value', () => {
    // See: https://docs.ethers.io/v5/api/utils/bytes/#utils-isHexString
    const invalidHexString = 'not a hex string';

    expect(() => encoding.convertBytes(invalidHexString)).toThrow('invalid arrayify value');
  });
});

describe('convertString', () => {
  it('converts empty string', () => {
    expect(encoding.convertString('')).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  it('converts a large string', () => {
    const longString = 'a string with more than 31 characters'; // 31 characters is maximum length for bytes32
    expect(encoding.convertString(longString)).toEqual(
      '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000256120737472696e672077697468206d6f7265207468616e2033312063686172616374657273000000000000000000000000000000000000000000000000000000'
    );
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
