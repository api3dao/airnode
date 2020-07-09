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

    it('throws an error for unconvertable arrays', () => {
      expect(() => caster.castValue([], 'int256')).toThrowError(new Error("Unable to convert: '[]' to int256"));
      expect(() => caster.castValue(['unknown'], 'int256')).toThrowError(
        new Error('Unable to convert: \'["unknown"]\' to int256')
      );
      expect(() => caster.castValue([{ a: 1 }], 'int256')).toThrowError(
        new Error('Unable to convert: \'[{"a":1}]\' to int256')
      );
    });

    it('casts booleans to either 1 or 0', () => {
      expect(caster.castValue(true, 'int256')).toEqual(1);
      expect(caster.castValue('true', 'int256')).toEqual(1);

      expect(caster.castValue(false, 'int256')).toEqual(0);
      expect(caster.castValue('false', 'int256')).toEqual(0);
    });

    it('casts number-like values to numbers', () => {
      expect(caster.castValue(0, 'int256')).toEqual(0);
      expect(caster.castValue('0', 'int256')).toEqual(0);
      expect(caster.castValue(777, 'int256')).toEqual(777);
    });
  });
});
