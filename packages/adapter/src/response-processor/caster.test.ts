import * as caster from './caster';

describe('castValue', () => {
  describe('casting boolean values', () => {
    it('returns false for false-like values', () => {
      expect(caster.castValue(0, 'bool')).toEqual(false);
      expect(caster.castValue('0', 'bool')).toEqual(false);

      expect(caster.castValue(false, 'bool')).toEqual(false);
      expect(caster.castValue('false', 'bool')).toEqual(false);

      expect(caster.castValue(undefined, 'bool')).toEqual(false);
      expect(caster.castValue(null, 'bool')).toEqual(false);
    });

    it('returns true for true-like values', () => {
      // Booleans
      expect(caster.castValue(true, 'bool')).toEqual(true);

      // Strings
      expect(caster.castValue('', 'bool')).toEqual(true);
      expect(caster.castValue('value', 'bool')).toEqual(true);

      // Non-zero numbers
      expect(caster.castValue(1, 'bool')).toEqual(true);
      expect(caster.castValue(-1, 'bool')).toEqual(true);
      expect(caster.castValue(7777, 'bool')).toEqual(true);
      expect(caster.castValue(Infinity, 'bool')).toEqual(true);

      // Arrays
      expect(caster.castValue([], 'bool')).toEqual(true);
      expect(caster.castValue([false], 'bool')).toEqual(true);

      // Objects
      expect(caster.castValue({}, 'bool')).toEqual(true);
      expect(caster.castValue({ value: 1 }, 'bool')).toEqual(true);
    });
  });

  describe('casting int256 values', () => {
    it('throws an error for invalid numbers', () => {
      expect(() => caster.castValue(undefined, 'int256')).toThrowError(
        new Error("Unable to convert: 'undefined' to int256")
      );
      expect(() => caster.castValue(null, 'int256')).toThrowError(new Error("Unable to convert: 'null' to int256"));
      expect(() => caster.castValue(NaN, 'int256')).toThrowError(new Error("Unable to convert: 'null' to int256"));
      expect(() => caster.castValue(Infinity, 'int256')).toThrowError(new Error("Unable to convert: 'null' to int256"));
      expect(() => caster.castValue('', 'int256')).toThrowError(new Error('Unable to convert: \'""\' to int256'));
    });

    it('throws an error for unknown strings', () => {
      expect(() => caster.castValue('', 'int256')).toThrowError(new Error('Unable to convert: \'""\' to int256'));
      expect(() => caster.castValue('unknown', 'int256')).toThrowError(
        new Error('Unable to convert: \'"unknown"\' to int256')
      );
    });

    it('throws an error for complex values', () => {
      // Arrays
      expect(() => caster.castValue([], 'int256')).toThrowError(new Error("Unable to convert: '[]' to int256"));
      expect(() => caster.castValue(['unknown'], 'int256')).toThrowError(
        new Error('Unable to convert: \'["unknown"]\' to int256')
      );
      expect(() => caster.castValue([{ a: 1 }], 'int256')).toThrowError(
        new Error('Unable to convert: \'[{"a":1}]\' to int256')
      );

      // Objects
      expect(() => caster.castValue({}, 'int256')).toThrowError(new Error("Unable to convert: '{}' to int256"));
      expect(() => caster.castValue({ a: 1 }, 'int256')).toThrowError(
        new Error('Unable to convert: \'{"a":1}\' to int256')
      );
    });

    it('casts boolean-like values to either 1 or 0', () => {
      expect(caster.castValue(false, 'int256')).toEqual(0);
      expect(caster.castValue('false', 'int256')).toEqual(0);

      expect(caster.castValue(true, 'int256')).toEqual(1);
      expect(caster.castValue('true', 'int256')).toEqual(1);
    });

    it('casts number-like values to numbers', () => {
      expect(caster.castValue(0, 'int256')).toEqual(0);
      expect(caster.castValue('0', 'int256')).toEqual(0);
      expect(caster.castValue('777.789', 'int256')).toEqual(777.789);
      expect(caster.castValue(777, 'int256')).toEqual(777);
      expect(caster.castValue(777.777, 'int256')).toEqual(777.777);
    });
  });

  describe('casting bytes32 values', () => {
    it('throws an error for object values', () => {
      expect(() => caster.castValue({}, 'bytes32')).toThrowError(new Error("Unable to convert: '{}' to bytes32"));
      expect(() => caster.castValue({ a: 1 }, 'bytes32')).toThrowError(
        new Error('Unable to convert: \'{"a":1}\' to bytes32')
      );
    });

    it('throws an error for array values', () => {
      expect(() => caster.castValue([], 'bytes32')).toThrowError(new Error("Unable to convert: '[]' to bytes32"));
      expect(() => caster.castValue([false], 'bytes32')).toThrowError(
        new Error("Unable to convert: '[false]' to bytes32")
      );
      expect(() => caster.castValue([true], 'bytes32')).toThrowError(
        new Error("Unable to convert: '[true]' to bytes32")
      );
      expect(() => caster.castValue(['unknown'], 'bytes32')).toThrowError(
        new Error('Unable to convert: \'["unknown"]\' to bytes32')
      );
      expect(() => caster.castValue([{ a: 1 }], 'bytes32')).toThrowError(
        new Error('Unable to convert: \'[{"a":1}]\' to bytes32')
      );
    });

    it('converts values to strings', () => {
      // Nil values
      expect(caster.castValue(null, 'bytes32')).toEqual('null');
      expect(caster.castValue(undefined, 'bytes32')).toEqual('undefined');

      // Booleans
      expect(caster.castValue(false, 'bytes32')).toEqual('false');
      expect(caster.castValue('false', 'bytes32')).toEqual('false');
      expect(caster.castValue(true, 'bytes32')).toEqual('true');
      expect(caster.castValue('true', 'bytes32')).toEqual('true');

      // Strings
      expect(caster.castValue('', 'bytes32')).toEqual('');
      expect(caster.castValue('unknown', 'bytes32')).toEqual('unknown');

      // Numbers
      expect(caster.castValue(-1, 'bytes32')).toEqual('-1');
      expect(caster.castValue(0, 'bytes32')).toEqual('0');
      expect(caster.castValue(1, 'bytes32')).toEqual('1');
      expect(caster.castValue(777.89, 'bytes32')).toEqual('777.89');
      expect(caster.castValue(Infinity, 'bytes32')).toEqual('Infinity');
      expect(caster.castValue(NaN, 'bytes32')).toEqual('NaN');
    });
  });
});

describe('multiplyValue', () => {
  it('multiplies number values by the times parameter', () => {
    const res = caster.multiplyValue(777.7777, 10_000);
    expect(res).toEqual('7777777');
  });

  it('multiplies string values by the times parameter', () => {
    const res = caster.multiplyValue('777.7777', '10000');
    expect(res).toEqual('7777777');
  });

  it('floors the result if there are any remaining decimals', () => {
    const res = caster.multiplyValue(777.7777, 3);
    expect(res).toEqual('2333');
  });

  it('handles very large numbers', () => {
    const res = caster.multiplyValue('123479127389712587938092347987348719823', 987298123);
    expect(res).toEqual('121910710701541127580751015368572218827700792229');
  });

  it('floors very large decimals', () => {
    const res = caster.multiplyValue('12479127389712987348782.371238923', 10);
    expect(res).toEqual('124791273897129873487823');
  });
});
