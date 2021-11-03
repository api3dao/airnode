import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import * as casting from './casting';

describe('castValue', () => {
  describe('casting boolean values', () => {
    it('returns false for false-like values', () => {
      expect(casting.castValue(0, 'bool')).toEqual(false);
      expect(casting.castValue('0', 'bool')).toEqual(false);

      expect(casting.castValue(false, 'bool')).toEqual(false);
      expect(casting.castValue('false', 'bool')).toEqual(false);

      expect(casting.castValue(undefined, 'bool')).toEqual(false);
      expect(casting.castValue(null, 'bool')).toEqual(false);
    });

    it('returns true for true-like values', () => {
      // Booleans
      expect(casting.castValue(true, 'bool')).toEqual(true);

      // Strings
      expect(casting.castValue('', 'bool')).toEqual(true);
      expect(casting.castValue('value', 'bool')).toEqual(true);

      // Non-zero numbers
      expect(casting.castValue(1, 'bool')).toEqual(true);
      expect(casting.castValue(-1, 'bool')).toEqual(true);
      expect(casting.castValue(7777, 'bool')).toEqual(true);
      expect(casting.castValue(Infinity, 'bool')).toEqual(true);

      // Arrays
      expect(casting.castValue([], 'bool')).toEqual(true);
      expect(casting.castValue([false], 'bool')).toEqual(true);

      // Objects
      expect(casting.castValue({}, 'bool')).toEqual(true);
      expect(casting.castValue({ value: 1 }, 'bool')).toEqual(true);
    });
  });

  describe('casting uint256 values', () => {
    it('throws an error for invalid numbers', () => {
      expect(() => casting.castValue(undefined, 'uint256')).toThrowError(
        new Error("Unable to convert: 'undefined' to uint256")
      );
      expect(() => casting.castValue(null, 'uint256')).toThrowError(new Error("Unable to convert: 'null' to uint256"));
      expect(() => casting.castValue(NaN, 'uint256')).toThrowError(new Error("Unable to convert: 'null' to uint256"));
      expect(() => casting.castValue(Infinity, 'uint256')).toThrowError(
        new Error("Unable to convert: 'null' to uint256")
      );
      expect(() => casting.castValue('', 'uint256')).toThrowError(new Error('Unable to convert: \'""\' to uint256'));
      expect(() => casting.castValue('123.123.123', 'uint256')).toThrowError(
        new Error('Unable to convert: \'"123.123.123"\' to uint256')
      );
    });

    it('throws an error for unknown strings', () => {
      expect(() => casting.castValue('', 'uint256')).toThrowError(new Error('Unable to convert: \'""\' to uint256'));
      expect(() => casting.castValue('unknown', 'uint256')).toThrowError(
        new Error('Unable to convert: \'"unknown"\' to uint256')
      );
    });

    it('throws an error for complex values', () => {
      // Arrays
      expect(() => casting.castValue([], 'uint256')).toThrowError(new Error("Unable to convert: '[]' to uint256"));
      expect(() => casting.castValue(['unknown'], 'uint256')).toThrowError(
        new Error('Unable to convert: \'["unknown"]\' to uint256')
      );
      expect(() => casting.castValue([{ a: 1 }], 'uint256')).toThrowError(
        new Error('Unable to convert: \'[{"a":1}]\' to uint256')
      );

      // Objects
      expect(() => casting.castValue({}, 'uint256')).toThrowError(new Error("Unable to convert: '{}' to uint256"));
      expect(() => casting.castValue({ a: 1 }, 'uint256')).toThrowError(
        new Error('Unable to convert: \'{"a":1}\' to uint256')
      );
    });

    it('casts boolean-like values to either 1 or 0', () => {
      const zero = new BigNumber(0);
      expect(casting.castValue(false, 'uint256')).toEqual(zero);
      expect(casting.castValue('false', 'uint256')).toEqual(zero);

      const one = new BigNumber(1);
      expect(casting.castValue(true, 'uint256')).toEqual(one);
      expect(casting.castValue('true', 'uint256')).toEqual(one);
    });

    it('casts number-like values to BigNumbers', () => {
      expect(casting.castValue(0, 'uint256')).toEqual(new BigNumber(0));
      expect(casting.castValue('0', 'uint256')).toEqual(new BigNumber(0));
      expect(casting.castValue('777.789', 'uint256')).toEqual(new BigNumber('777.789'));
      expect(casting.castValue(777, 'uint256')).toEqual(new BigNumber(777));
      expect(casting.castValue(777.777, 'uint256')).toEqual(new BigNumber('777.777'));
      expect(casting.castValue(Number.MAX_SAFE_INTEGER.toString() + '1000', 'uint256')).toEqual(
        new BigNumber('90071992547409911000')
      );
    });
  });

  describe('casting int256 values', () => {
    it('throws an error for invalid numbers', () => {
      expect(() => casting.castValue(undefined, 'int256')).toThrowError(
        new Error("Unable to convert: 'undefined' to int256")
      );
      expect(() => casting.castValue(null, 'int256')).toThrowError(new Error("Unable to convert: 'null' to int256"));
      expect(() => casting.castValue(NaN, 'int256')).toThrowError(new Error("Unable to convert: 'null' to int256"));
      expect(() => casting.castValue(Infinity, 'int256')).toThrowError(
        new Error("Unable to convert: 'null' to int256")
      );
      expect(() => casting.castValue('', 'int256')).toThrowError(new Error('Unable to convert: \'""\' to int256'));
      expect(() => casting.castValue('123.123.123', 'int256')).toThrowError(
        new Error('Unable to convert: \'"123.123.123"\' to int256')
      );
    });

    it('throws an error for unknown strings', () => {
      expect(() => casting.castValue('', 'int256')).toThrowError(new Error('Unable to convert: \'""\' to int256'));
      expect(() => casting.castValue('unknown', 'int256')).toThrowError(
        new Error('Unable to convert: \'"unknown"\' to int256')
      );
    });

    it('throws an error for complex values', () => {
      // Arrays
      expect(() => casting.castValue([], 'int256')).toThrowError(new Error("Unable to convert: '[]' to int256"));
      expect(() => casting.castValue(['unknown'], 'int256')).toThrowError(
        new Error('Unable to convert: \'["unknown"]\' to int256')
      );
      expect(() => casting.castValue([{ a: 1 }], 'int256')).toThrowError(
        new Error('Unable to convert: \'[{"a":1}]\' to int256')
      );

      // Objects
      expect(() => casting.castValue({}, 'int256')).toThrowError(new Error("Unable to convert: '{}' to int256"));
      expect(() => casting.castValue({ a: 1 }, 'int256')).toThrowError(
        new Error('Unable to convert: \'{"a":1}\' to int256')
      );
    });

    it('casts boolean-like values to either 1 or 0', () => {
      const zero = new BigNumber(0);
      expect(casting.castValue(false, 'int256')).toEqual(zero);
      expect(casting.castValue('false', 'int256')).toEqual(zero);

      const one = new BigNumber(1);
      expect(casting.castValue(true, 'int256')).toEqual(one);
      expect(casting.castValue('true', 'int256')).toEqual(one);
    });

    it('casts number-like values to BigNumbers', () => {
      expect(casting.castValue(0, 'int256')).toEqual(new BigNumber(0));
      expect(casting.castValue('0', 'int256')).toEqual(new BigNumber(0));
      expect(casting.castValue('777.789', 'int256')).toEqual(new BigNumber('777.789'));
      expect(casting.castValue(777, 'int256')).toEqual(new BigNumber(777));
      expect(casting.castValue(777.777, 'int256')).toEqual(new BigNumber('777.777'));
      expect(casting.castValue(Number.MAX_SAFE_INTEGER.toString() + '1000', 'int256')).toEqual(
        new BigNumber('90071992547409911000')
      );
    });
  });

  describe('casting bytes32 values', () => {
    it('throws an error for object values', () => {
      expect(() => casting.castValue({}, 'bytes32')).toThrowError(new Error("Unable to convert: '{}' to bytes32"));
      expect(() => casting.castValue({ a: 1 }, 'bytes32')).toThrowError(
        new Error('Unable to convert: \'{"a":1}\' to bytes32')
      );
    });

    it('throws an error for array values', () => {
      expect(() => casting.castValue([], 'bytes32')).toThrowError(new Error("Unable to convert: '[]' to bytes32"));
      expect(() => casting.castValue([false], 'bytes32')).toThrowError(
        new Error("Unable to convert: '[false]' to bytes32")
      );
      expect(() => casting.castValue([true], 'bytes32')).toThrowError(
        new Error("Unable to convert: '[true]' to bytes32")
      );
      expect(() => casting.castValue(['unknown'], 'bytes32')).toThrowError(
        new Error('Unable to convert: \'["unknown"]\' to bytes32')
      );
      expect(() => casting.castValue([{ a: 1 }], 'bytes32')).toThrowError(
        new Error('Unable to convert: \'[{"a":1}]\' to bytes32')
      );
    });

    it('converts values to strings', () => {
      // Nil values
      expect(casting.castValue(null, 'bytes32')).toEqual('null');
      expect(casting.castValue(undefined, 'bytes32')).toEqual('undefined');

      // Booleans
      expect(casting.castValue(false, 'bytes32')).toEqual('false');
      expect(casting.castValue('false', 'bytes32')).toEqual('false');
      expect(casting.castValue(true, 'bytes32')).toEqual('true');
      expect(casting.castValue('true', 'bytes32')).toEqual('true');

      // Strings
      expect(casting.castValue('', 'bytes32')).toEqual('');
      expect(casting.castValue('unknown', 'bytes32')).toEqual('unknown');

      // Numbers
      expect(casting.castValue(-1, 'bytes32')).toEqual('-1');
      expect(casting.castValue(0, 'bytes32')).toEqual('0');
      expect(casting.castValue(1, 'bytes32')).toEqual('1');
      expect(casting.castValue(777.89, 'bytes32')).toEqual('777.89');
      expect(casting.castValue(Infinity, 'bytes32')).toEqual('Infinity');
      expect(casting.castValue(NaN, 'bytes32')).toEqual('NaN');
    });
  });

  describe('casting string values', () => {
    it('throws an error for object values', () => {
      expect(() => casting.castValue({}, 'string')).toThrowError(new Error("Unable to convert: '{}' to string"));
      expect(() => casting.castValue({ a: 1 }, 'string')).toThrowError(
        new Error('Unable to convert: \'{"a":1}\' to string')
      );
    });

    it('throws an error for array values', () => {
      expect(() => casting.castValue([], 'string')).toThrowError(new Error("Unable to convert: '[]' to string"));
      expect(() => casting.castValue([false], 'string')).toThrowError(
        new Error("Unable to convert: '[false]' to string")
      );
      expect(() => casting.castValue([true], 'string')).toThrowError(
        new Error("Unable to convert: '[true]' to string")
      );
      expect(() => casting.castValue(['unknown'], 'string')).toThrowError(
        new Error('Unable to convert: \'["unknown"]\' to string')
      );
      expect(() => casting.castValue([{ a: 1 }], 'string')).toThrowError(
        new Error('Unable to convert: \'[{"a":1}]\' to string')
      );
    });

    it('converts values to strings', () => {
      // Nil values
      expect(casting.castValue(null, 'string')).toEqual('null');
      expect(casting.castValue(undefined, 'string')).toEqual('undefined');

      // Booleans
      expect(casting.castValue(false, 'string')).toEqual('false');
      expect(casting.castValue('false', 'string')).toEqual('false');
      expect(casting.castValue(true, 'string')).toEqual('true');
      expect(casting.castValue('true', 'string')).toEqual('true');

      // Strings
      expect(casting.castValue('', 'string')).toEqual('');
      expect(casting.castValue('unknown', 'string')).toEqual('unknown');

      // Numbers
      expect(casting.castValue(-1, 'string')).toEqual('-1');
      expect(casting.castValue(0, 'string')).toEqual('0');
      expect(casting.castValue(1, 'string')).toEqual('1');
      expect(casting.castValue(777.89, 'string')).toEqual('777.89');
      expect(casting.castValue(Infinity, 'string')).toEqual('Infinity');
      expect(casting.castValue(NaN, 'string')).toEqual('NaN');
    });
  });

  describe('convert address values', () => {
    it('throws on invalid address', () => {
      expect(() => casting.castValue(null, 'address')).toThrow(`Unable to convert: 'null' to address`);
      expect(() => casting.castValue('invalid address', 'address')).toThrow(
        `Unable to convert: 'invalid address' to address`
      );
      expect(() => casting.castValue({}, 'address')).toThrow(`Unable to convert: '{}' to address`);
    });

    it('casts valid addresses', () => {
      const addressStr = '0xe021f6bfbdd53c3fd0c5cfd4139b51d1f3108a74';
      expect(casting.castValue(addressStr, 'address')).toBe(addressStr);
    });
  });

  describe('convert bytes values', () => {
    it('throws on invalid value', () => {
      expect(() => casting.castValue(null, 'bytes')).toThrow(`Unable to convert: 'null' to bytes`);
      expect(() => casting.castValue('invalid bytes', 'bytes')).toThrow(`invalid hexlify value`);
      expect(() => casting.castValue({}, 'bytes')).toThrow(`Unable to convert: '{}' to bytes`);

      expect(() => casting.castValue('0x123', 'bytes')).toThrow('hex data is odd-length');
    });

    it('casts valid bytes string', () => {
      const exampleString = 'this is an example string that is a bit longer';
      const bytesString = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(exampleString));
      expect(bytesString).toBe(
        '0x7468697320697320616e206578616d706c6520737472696e672074686174206973206120626974206c6f6e676572'
      );

      expect(casting.castValue(bytesString, 'bytes')).toBe(bytesString);
    });
  });

  describe('convert array values', () => {
    it('convert flat array types', () => {
      const beforeCast = [0, '123', '777.789', false, true];
      const afterCast = [
        new BigNumber('0'),
        new BigNumber('123'),
        new BigNumber('777.789'),
        new BigNumber('0'),
        new BigNumber('1'),
      ];

      expect(casting.castValue(beforeCast, 'uint256[]')).toEqual(afterCast);
      expect(casting.castValue(beforeCast, 'uint256[5]')).toEqual(afterCast);
    });

    it('convert nested array types', () => {
      const beforeCast = [[0, '123', '777.789', false, true], [], [45, 89]];
      const afterCast = [
        [new BigNumber('0'), new BigNumber('123'), new BigNumber('777.789'), new BigNumber('0'), new BigNumber('1')],
        [],
        [new BigNumber('45'), new BigNumber('89')],
      ];

      expect(casting.castValue(beforeCast, 'uint256[][]')).toEqual(afterCast);
      expect(casting.castValue(beforeCast, 'uint256[3][]')).toEqual(afterCast);
    });

    it('throws an error if unable to cast the value', () => {
      const beforeCast = [0, '123', '777.789', false, true];
      expect(() => casting.castValue(beforeCast, 'uint256[][]')).toThrowError('Expected 0 to be an array');
      expect(() => casting.castValue(beforeCast, 'uint256[7]')).toThrowError('Expected array length 7 but it was 5');
    });
  });
});

describe('multiplyValue', () => {
  it('multiplies number values by the times parameter', () => {
    const value = new BigNumber('777.7777');
    const times = new BigNumber(10_000);
    const res = casting.multiplyValue(value, times);
    expect(res).toEqual('7777777');
  });

  it('multiplies string values by the times parameter', () => {
    const res = casting.multiplyValue('777.7777', '10000');
    expect(res).toEqual('7777777');
  });

  it('floors the result if there are any remaining decimals', () => {
    const value = new BigNumber(777.7777);
    const res = casting.multiplyValue(value, '3');
    expect(res).toEqual('2333');
  });

  it('handles very large numbers', () => {
    const res = casting.multiplyValue('123479127389712587938092347987348719823', '987298123');
    expect(res).toEqual('121910710701541127580751015368572218827700792229');
  });

  it('floors very large decimals', () => {
    const res = casting.multiplyValue('12479127389712987348782.371238923', new BigNumber(10));
    expect(res).toEqual('124791273897129873487823');
  });

  it('floors the number if there is no times', () => {
    const res = casting.multiplyValue('777.7777');
    expect(res).toEqual('777');
  });
});

describe('bigNumberToString', () => {
  it('returns the string equivalent', () => {
    expect(casting.bigNumberToString(new BigNumber(-999))).toEqual('-999');
    expect(casting.bigNumberToString(new BigNumber('0'))).toEqual('0');
    expect(casting.bigNumberToString(new BigNumber(Number.MAX_SAFE_INTEGER))).toEqual('9007199254740991');
    expect(casting.bigNumberToString(new BigNumber('123.123'))).toEqual('123.123');
    expect(casting.bigNumberToString(new BigNumber(123.123))).toEqual('123.123');
  });
});

describe('floorStringifiedNumber', () => {
  it('returns the number before the decimal point', () => {
    expect(casting.floorStringifiedNumber('1234.99')).toEqual('1234');
  });
});
