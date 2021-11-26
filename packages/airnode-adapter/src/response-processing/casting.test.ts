import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { castValue, multiplyValue, bigNumberToString, floorStringifiedNumber } from './casting';

describe('castValue', () => {
  describe('casting boolean values', () => {
    it('returns false for false-like values', () => {
      expect(castValue(0, 'bool')).toEqual(false);
      expect(castValue('0', 'bool')).toEqual(false);

      expect(castValue(false, 'bool')).toEqual(false);
      expect(castValue('false', 'bool')).toEqual(false);

      expect(castValue(undefined, 'bool')).toEqual(false);
      expect(castValue(null, 'bool')).toEqual(false);
    });

    it('returns true for true-like values', () => {
      // Booleans
      expect(castValue(true, 'bool')).toEqual(true);

      // Strings
      expect(castValue('', 'bool')).toEqual(true);
      expect(castValue('value', 'bool')).toEqual(true);

      // Non-zero numbers
      expect(castValue(1, 'bool')).toEqual(true);
      expect(castValue(-1, 'bool')).toEqual(true);
      expect(castValue(7777, 'bool')).toEqual(true);
      expect(castValue(Infinity, 'bool')).toEqual(true);

      // Arrays
      expect(castValue([], 'bool')).toEqual(true);
      expect(castValue([false], 'bool')).toEqual(true);

      // Objects
      expect(castValue({}, 'bool')).toEqual(true);
      expect(castValue({ value: 1 }, 'bool')).toEqual(true);
    });
  });

  ['uint256', 'int256'].forEach((type) => {
    describe(`casting ${type} values`, () => {
      it('throws an error for invalid numbers', () => {
        expect(() => castValue(undefined, type)).toThrowError(
          `Unable to convert: 'undefined' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue(null, type)).toThrowError(
          `Unable to convert: 'null' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue(NaN, type)).toThrowError(
          `Unable to convert: 'NaN' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue(Infinity, type)).toThrowError(
          `Unable to convert: 'Infinity' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue('', type)).toThrowError(
          `Unable to convert: '' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue('123.123.123', type)).toThrowError(
          `Unable to convert: '123.123.123' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue('-true', type)).toThrowError(
          `Unable to convert: '-true' to '${type}'. Reason: Invalid number value`
        );
      });

      it('throws an error for unknown strings', () => {
        expect(() => castValue('', type)).toThrowError(
          `Unable to convert: '' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue('unknown', type)).toThrowError(
          `Unable to convert: 'unknown' to '${type}'. Reason: Invalid number value`
        );
      });

      it('throws an error for complex values', () => {
        // Arrays
        expect(() => castValue([], type)).toThrowError(
          `Unable to convert: '[]' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue(['unknown'], type)).toThrowError(
          `Unable to convert: \'["unknown"]\' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue([{ a: 1 }], type)).toThrowError(
          `Unable to convert: \'[{"a":1}]\' to '${type}'. Reason: Invalid number value`
        );

        // Objects
        expect(() => castValue({}, type)).toThrowError(
          `Unable to convert: '{}' to '${type}'. Reason: Invalid number value`
        );
        expect(() => castValue({ a: 1 }, type)).toThrowError(
          `Unable to convert: \'{"a":1}\' to '${type}'. Reason: Invalid number value`
        );
      });

      it('casts boolean-like values to either 1 or 0', () => {
        const zero = new BigNumber(0);
        expect(castValue(false, type)).toEqual(zero);
        expect(castValue('false', type)).toEqual(zero);

        const one = new BigNumber(1);
        expect(castValue(true, type)).toEqual(one);
        expect(castValue('true', type)).toEqual(one);
      });

      it('casts number-like values to BigNumbers', () => {
        expect(castValue(0, type)).toEqual(new BigNumber(0));
        expect(castValue('0', type)).toEqual(new BigNumber(0));
        expect(castValue('777.789', type)).toEqual(new BigNumber('777.789'));
        expect(castValue(777, type)).toEqual(new BigNumber(777));
        expect(castValue(777.777, type)).toEqual(new BigNumber('777.777'));
        expect(castValue(Number.MAX_SAFE_INTEGER.toString() + '1000', type)).toEqual(
          new BigNumber('90071992547409911000')
        );

        // Notice that negative numbers are both casted without error by both int256 and uint256
        expect(castValue('-123.456', type)).toEqual(new BigNumber('-123.456'));
        expect(castValue(-789, type)).toEqual(new BigNumber('-789'));
      });
    });
  });

  ['string', 'string32'].forEach((type) => {
    describe(`casting ${type} values`, () => {
      it('throws an error for object values', () => {
        expect(() => castValue({}, type)).toThrowError(
          `Unable to convert: '{}' to '${type}'. Reason: Value is an object`
        );
        expect(() => castValue({ a: 1 }, type)).toThrowError(
          `Unable to convert: '{"a":1}' to '${type}'. Reason: Value is an object`
        );
      });

      it('throws an error for array values', () => {
        expect(() => castValue([], type)).toThrowError(
          `Unable to convert: '[]' to '${type}'. Reason: Value is an array`
        );
        expect(() => castValue([false], type)).toThrowError(
          `Unable to convert: '[false]' to '${type}'. Reason: Value is an array`
        );
        expect(() => castValue(['unknown'], type)).toThrowError(
          `Unable to convert: '["unknown"]' to '${type}'. Reason: Value is an array`
        );
        expect(() => castValue([{ a: 1 }], type)).toThrowError(
          `Unable to convert: '[{"a":1}]' to '${type}'. Reason: Value is an array`
        );
      });
    });
  });

  it('casting valid string values', () => {
    // Nil values
    expect(castValue(null, 'string')).toEqual('null');
    expect(castValue(undefined, 'string')).toEqual('undefined');

    // Booleans
    expect(castValue(false, 'string')).toEqual('false');
    expect(castValue('false', 'string')).toEqual('false');
    expect(castValue(true, 'string')).toEqual('true');
    expect(castValue('true', 'string')).toEqual('true');

    // Strings
    expect(castValue('', 'string')).toEqual('');
    expect(castValue('unknown', 'string')).toEqual('unknown');
    const longString = 'a really long string with more than 32 chars';
    expect(castValue(longString, 'string')).toEqual(longString);

    // Numbers
    expect(castValue(-1, 'string')).toEqual('-1');
    expect(castValue(0, 'string')).toEqual('0');
    expect(castValue(1, 'string')).toEqual('1');
    expect(castValue(777.89, 'string')).toEqual('777.89');
    expect(castValue(Infinity, 'string')).toEqual('Infinity');
    expect(castValue(NaN, 'string')).toEqual('NaN');
  });

  describe('convert address values', () => {
    it('throws on invalid address', () => {
      expect(() => castValue(null, 'address')).toThrow(
        `Unable to convert: 'null' to 'address'. Reason: Invalid address`
      );
      expect(() => castValue('invalid address', 'address')).toThrow(
        `Unable to convert: 'invalid address' to 'address'. Reason: Invalid address`
      );
      expect(() => castValue({}, 'address')).toThrow(
        `Unable to convert: '{}' to 'address'. Reason: Value is an object`
      );
    });

    it('casts valid addresses', () => {
      const addressStr = '0xe021f6bfbdd53c3fd0c5cfd4139b51d1f3108a74';
      expect(castValue(addressStr, 'address')).toBe(addressStr);

      expect(castValue(addressStr.substr(2), 'address')).toBe('e021f6bfbdd53c3fd0c5cfd4139b51d1f3108a74');
    });
  });

  ['bytes', 'bytes32'].forEach((type) => {
    describe(`convert ${type} values`, () => {
      it('throws on invalid value', () => {
        expect(() => castValue(null, type)).toThrow(`Unable to convert: 'null' to '${type}'`);
        expect(() => castValue('invalid bytes', type)).toThrow(`invalid hexlify value`);
        expect(() => castValue({}, type)).toThrow(`Unable to convert: '{}' to '${type}'`);

        expect(() => castValue('0x123', type)).toThrow('hex data is odd-length');
      });

      it('casts valid bytes string', () => {
        const exampleString = 'this is an example string that is a bit longer';
        const bytesString = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(exampleString));
        expect(bytesString).toBe(
          '0x7468697320697320616e206578616d706c6520737472696e672074686174206973206120626974206c6f6e676572'
        );

        expect(castValue(bytesString, type)).toBe(bytesString);
      });
    });
  });

  describe('convert array values', () => {
    const nestedBeforeCast = [[0, '123', '777.789', false, true], [], [45, 89]];
    const nestedAfterCast = [
      [new BigNumber('0'), new BigNumber('123'), new BigNumber('777.789'), new BigNumber('0'), new BigNumber('1')],
      [],
      [new BigNumber('45'), new BigNumber('89')],
    ];

    it('convert flat array values', () => {
      const beforeCast = [0, '123', '777.789', false, true];
      const afterCast = [
        new BigNumber('0'),
        new BigNumber('123'),
        new BigNumber('777.789'),
        new BigNumber('0'),
        new BigNumber('1'),
      ];

      expect(castValue(beforeCast, 'uint256[]')).toEqual(afterCast);
      expect(castValue(beforeCast, 'uint256[5]')).toEqual(afterCast);
    });

    describe('casting nested array values', () => {
      it('works and ignores fixed array sizes', () => {
        expect(castValue(nestedBeforeCast, 'uint256[][]')).toEqual(nestedAfterCast);
        expect(castValue(nestedBeforeCast, 'uint256[100][200]')).toEqual(nestedAfterCast);
      });
    });

    it('throws an error if unable to cast the value', () => {
      const beforeCast = [0, '123', '777.789', false, true];
      expect(() => castValue(beforeCast, 'uint256[][]')).toThrowError('Expected 0 to be an array');
      expect(() => castValue(beforeCast, 'uint256[-7]')).toThrowError('Invalid type: uint256[-7]');

      expect(() => castValue(nestedBeforeCast, 'uint256[]')).toThrowError(
        `Unable to convert: '[[0,"123","777.789",false,true],[],[45,89]]' to 'uint256[]'. Reason: Invalid number value`
      );
    });
  });

  it('convert valid string32 values', () => {
    const longString = 'a really long string with more than 32 chars';
    expect(castValue(longString, 'string32')).toEqual(
      '0x61207265616c6c79206c6f6e6720737472696e672077697468206d6f72652000'
    );

    const maxLengthStr = longString.substring(0, 31);
    expect(castValue(maxLengthStr, 'string32')).toEqual(
      '0x61207265616c6c79206c6f6e6720737472696e672077697468206d6f72652000'
    );
  });

  it('allows requester to return timestamp', () => {
    const time = new Date('2020-01-01').getTime();
    // eslint-disable-next-line functional/immutable-data
    Date.now = jest.spyOn(Date, 'now').mockImplementation(() => time) as any;
    expect(time).toEqual(1577836800000);

    expect(castValue('this value will not be used', 'timestamp')).toEqual(new BigNumber(time / 1000).toString());
  });
});

describe('multiplyValue', () => {
  it('multiplies number values by the times parameter', () => {
    const value = new BigNumber('777.7777');
    const times = new BigNumber(10_000);
    const res = multiplyValue(value, times);
    expect(res).toEqual('7777777');
  });

  it('multiplies string values by the times parameter', () => {
    const res = multiplyValue('777.7777', '10000');
    expect(res).toEqual('7777777');
  });

  it('floors the result if there are any remaining decimals', () => {
    const value = new BigNumber(777.7777);
    const res = multiplyValue(value, '3');
    expect(res).toEqual('2333');
  });

  it('handles very large numbers', () => {
    const res = multiplyValue('123479127389712587938092347987348719823', '987298123');
    expect(res).toEqual('121910710701541127580751015368572218827700792229');
  });

  it('floors very large decimals', () => {
    const res = multiplyValue('12479127389712987348782.371238923', new BigNumber(10));
    expect(res).toEqual('124791273897129873487823');
  });

  it('floors the number if there is no times', () => {
    const res = multiplyValue('777.7777');
    expect(res).toEqual('777');
  });
});

describe('bigNumberToString', () => {
  it('returns the string equivalent', () => {
    expect(bigNumberToString(new BigNumber(-999))).toEqual('-999');
    expect(bigNumberToString(new BigNumber('0'))).toEqual('0');
    expect(bigNumberToString(new BigNumber(Number.MAX_SAFE_INTEGER))).toEqual('9007199254740991');
    expect(bigNumberToString(new BigNumber('123.123'))).toEqual('123.123');
    expect(bigNumberToString(new BigNumber(123.123))).toEqual('123.123');
  });
});

describe('floorStringifiedNumber', () => {
  it('returns the number before the decimal point', () => {
    expect(floorStringifiedNumber('1234.99')).toEqual('1234');
  });
});
