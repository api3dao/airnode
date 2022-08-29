import { ethers } from 'ethers';
import { encodeValue, getSolidityType } from './encoding';

['uint256', 'int256'].forEach((type) => {
  describe(`Encodes ${type} values`, () => {
    if (type === 'uint256') {
      it(`throws when encoding negative number`, () => {
        expect(() => encodeValue('-777', type)).toThrow();
      });

      it('handles uint256 max number', () => {
        expect(
          encodeValue('115792089237316195423570985008687907853269984665640564039457584007913129639935', type)
        ).toEqual('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      });
    } else {
      it(`encodes negative number`, () => {
        expect(encodeValue('-777', type)).toEqual('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffcf7');
      });

      it('throws on uint256 max number', () => {
        expect(() =>
          encodeValue('115792089237316195423570985008687907853269984665640564039457584007913129639935', type)
        ).toThrow('out-of-bounds');
      });
    }

    it('encodes valid numbers', () => {
      expect(encodeValue('1234567890', type)).toEqual(
        '0x00000000000000000000000000000000000000000000000000000000499602d2'
      );
      expect(encodeValue('0', type)).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('throws on floating point numbers', () => {
      expect(() => {
        encodeValue('12.3', type);
      }).toThrow();
    });
  });
});

it('Encodes bool values', () => {
  expect(encodeValue(true, 'bool')).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001');
  expect(encodeValue(false, 'bool')).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');
});

describe('Encodes bytes32 values', () => {
  it('encodes short bytes', () => {
    const encodedString = ethers.utils.formatBytes32String('randomstring');
    expect(encodedString).toEqual('0x72616e646f6d737472696e670000000000000000000000000000000000000000');
    expect(encodeValue(encodedString, 'bytes32')).toEqual(encodedString);

    const encodedEmpty = ethers.utils.formatBytes32String('');
    expect(encodedEmpty).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');
    expect(encodeValue(encodedEmpty, 'bytes32')).toEqual(encodedEmpty);
  });

  it('throws on invalid bytes', () => {
    const invalidBytes = '0x123';
    expect(() => encodeValue(invalidBytes, 'bytes32')).toThrow('hex data is odd-length');
  });
});

describe('Encodes address values', () => {
  it('valid address', () => {
    expect(encodeValue('0x8f0633d80Be1EA5B5DF1909b64f2573622290576', 'address')).toEqual(
      '0x0000000000000000000000008f0633d80be1ea5b5df1909b64f2573622290576'
    );
  });

  it('throws on invalid address', () => {
    expect(() => encodeValue('0xInvalid', 'address')).toThrow('invalid address');
  });
});

describe('Encodes bytes values', () => {
  it('bytes string', () => {
    const { hexlify, arrayify, toUtf8String, toUtf8Bytes, defaultAbiCoder } = ethers.utils;
    const exampleString = 'this is an example string that is a bit longer';
    const bytesString = hexlify(toUtf8Bytes(exampleString));
    expect(bytesString).toBe(
      '0x7468697320697320616e206578616d706c6520737472696e672074686174206973206120626974206c6f6e676572'
    );

    const encoded = encodeValue(bytesString, 'bytes');
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

    expect(() => encodeValue(invalidHexString, 'bytes')).toThrow('invalid arrayify value');
  });
});

it('Encodes string values', () => {
  expect(encodeValue('randomstring', 'string')).toEqual(
    '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000c72616e646f6d737472696e670000000000000000000000000000000000000000'
  );
  expect(encodeValue('', 'string')).toEqual(
    '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000'
  );

  const longString = 'a string with more than 31 characters'; // 31 characters is maximum length for bytes32
  expect(encodeValue(longString, 'string')).toEqual(
    '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000256120737472696e672077697468206d6f7265207468616e2033312063686172616374657273000000000000000000000000000000000000000000000000000000'
  );
});

describe('Encoding array values', () => {
  it('one dimensional array', () => {
    const array = ['123', '456'];

    expect(encodeValue(array, 'int256[]')).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000007b00000000000000000000000000000000000000000000000000000000000001c8'
    );
    expect(encodeValue(array, 'int256[2]')).toEqual(
      '0x000000000000000000000000000000000000000000000000000000000000007b00000000000000000000000000000000000000000000000000000000000001c8'
    );
  });

  it('mixed fixes/unlimited array', () => {
    const array = [
      [['30', '40']],
      [['10', '20']],
      [
        ['1', '2'],
        ['3', '4'],
      ],
    ];

    expect(encodeValue(array, 'int256[2][][3]')).toEqual(
      '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000004'
    );
  });

  it('throws on invalid encoding type', () => {
    expect(() => encodeValue('', 'unit256')).toThrow(`invalid type (argument=\"type\", value=\"unit256\"`);
    expect(() => encodeValue('', 'int256[[]]')).toThrow(
      `unexpected character at position 7 (argument=\"param\", value=\"int256[[]]\"`
    );
    expect(() => encodeValue('', '[int256]')).toThrow(
      `unexpected character at position 0 (argument=\"param\", value=\"[int256]\"`
    );
  });
});

it('tests getSolidityType', () => {
  expect(getSolidityType('string32')).toEqual('bytes32');
  expect(getSolidityType('timestamp')).toEqual('uint256');
  expect(getSolidityType('string32[][7]')).toEqual('bytes32[][7]');

  expect(getSolidityType('address[7][][3]')).toEqual('address[7][][3]');
});
