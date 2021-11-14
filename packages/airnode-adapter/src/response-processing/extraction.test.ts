import { ethers } from 'ethers';
import {
  splitReservedParameters,
  getRawValue,
  extractAndEncodeResponse,
  extractValue,
  escapeAwareSplit,
  unescape,
} from './extraction';
import { ReservedParameters } from '../types';

describe('getRawValue', () => {
  it('returns the data as is if no path is provided', () => {
    expect(getRawValue('somevalue')).toEqual('somevalue');
    expect(getRawValue(false)).toEqual(false);
    expect(getRawValue(500)).toEqual(500);
  });

  it('gets the value from a deeply nested object path', () => {
    const obj = { a: { b: [{ c: 1 }, { d: 5 }] } };
    expect(getRawValue(obj, 'a.b.1.d')).toEqual(5);
  });

  it('gets the value from an array path', () => {
    const obj = [{ values: [422, 413, 401] }, { values: [731, 728, 739] }];
    expect(getRawValue(obj, '1.values.2')).toEqual(739);
  });

  it('prefers the nested value from an ambiguous object', () => {
    const obj = {
      'foo.bar.0': { baz: 555 },
      foo: { bar: [{ baz: 888 }] },
    };
    expect(getRawValue(obj, 'foo.bar.0.baz')).toEqual(888);
  });

  it('returns undefined if the value cannot be found', () => {
    const obj = { a: 1 };
    expect(getRawValue(obj, 'unknown')).toEqual(undefined);
  });

  it('returns the default value if unable to find the specified value', () => {
    const obj = { a: 1 };
    expect(getRawValue(obj, 'unknown', 'default')).toEqual('default');
  });

  it('respects escaped path', () => {
    const obj = {
      'foo.bar.0': { baz: 555 },
      foo: { bar: [{ baz: 888 }] },
    };
    expect(getRawValue(obj, 'foo\\.bar\\.0.baz')).toEqual(555);
  });
});

describe('extractValue', () => {
  it('returns the extracted value', () => {
    const obj = { a: { b: [{ c: 1 }, { d: 5 }] } };
    expect(extractValue(obj, 'a.b.1.d')).toEqual(5);
  });

  it('throws an error if a value cannot be found', () => {
    const obj = { a: 1 };
    expect(() => extractValue(obj, 'unknown')).toThrow(new Error("Unable to find value from path: 'unknown'"));
  });
});

describe('extract and encode single value', () => {
  it('returns a simple value with the encodedValue', () => {
    const encodedString = ethers.utils.formatBytes32String('simplestring');
    const res = extractAndEncodeResponse(encodedString, { _type: 'bytes32' });
    expect(res).toEqual({
      values: [encodedString],
      rawValue: encodedString,
      encodedValue: '0x73696d706c65737472696e670000000000000000000000000000000000000000',
    });
  });

  it('extracts and encodes the value from complex objects', () => {
    const data = { a: { b: [{ c: 1 }, { d: '750.51' }] } };
    const parameters: ReservedParameters = { _path: 'a.b.1.d', _type: 'int256', _times: '100' };
    const res = extractAndEncodeResponse(data, parameters);
    expect(res).toEqual({
      rawValue: data,
      values: ['75051'],
      encodedValue: '0x000000000000000000000000000000000000000000000000000000000001252b',
    });
  });

  it('accepts "" (empty string) for _times parameter', () => {
    const data = { a: { b: [{ c: 1 }, { d: '750.51' }] } };
    const parameters: ReservedParameters = { _path: 'a.b.1.d', _type: 'int256', _times: '' };
    const res = extractAndEncodeResponse(data, parameters);
    expect(res).toEqual({
      rawValue: data,
      values: ['750'],
      encodedValue: '0x00000000000000000000000000000000000000000000000000000000000002ee',
    });
  });

  it('empty string in path returns the whole API response', () => {
    const data = 123456;
    const parameters: ReservedParameters = { _path: '', _type: 'int256' };
    const res = extractAndEncodeResponse(data, parameters);
    expect(res).toEqual({
      rawValue: 123456,
      values: ['123456'],
      encodedValue: '0x000000000000000000000000000000000000000000000000000000000001e240',
    });
  });
});

describe('extract and encode multiple values', () => {
  it('works for basic request', () => {
    const data = { a: { b: [{ c: 1 }, { d: '750.51' }] } };
    const parameters: ReservedParameters = { _path: 'a.b.1.d,a.b.0.c', _type: 'int256,bool', _times: '100,' };
    const res = extractAndEncodeResponse(data, parameters);
    expect(res).toEqual({
      rawValue: data,
      values: ['75051', true],
      encodedValue:
        '0x000000000000000000000000000000000000000000000000000000000001252b0000000000000000000000000000000000000000000000000000000000000001',
    });
  });

  it('works for more complex request', () => {
    const data = [12.3, 45.6];
    const parameters: ReservedParameters = { _path: ',0', _type: 'int256[],int256', _times: '100,1000' };
    const res = extractAndEncodeResponse(data, parameters);
    expect(res).toEqual({
      rawValue: data,
      values: [['1230', '4560'], '12300'],
      encodedValue:
        '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000300c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000004ce00000000000000000000000000000000000000000000000000000000000011d0',
    });
  });

  it('tests unescape function', () => {
    expect(unescape('abcd', ',')).toEqual('abcd');
    expect(unescape('\\\\', ',')).toEqual('\\\\');
    expect(unescape('\\,\\', ',')).toEqual(',\\');
  });

  describe('tests escapeAwareSplit function', () => {
    it('works for basic usage', () => {
      expect(escapeAwareSplit('simple,string', ',')).toEqual(['simple', 'string']);
      expect(escapeAwareSplit('simple,string', '.')).toEqual(['simple,string']);
    });

    it('correctly removes the escape delimeter', () => {
      expect(escapeAwareSplit('simple\\,string', ',')).toEqual(['simple,string']);
      expect(escapeAwareSplit('simple\\\\\\,string', ',')).toEqual(['simple\\\\,string']);
      expect(escapeAwareSplit('\\a....' + '\\'.repeat(6), ',')).toEqual(['\\a....' + '\\'.repeat(6)]);
    });

    it('works with edge cases', () => {
      // empty splits
      expect(escapeAwareSplit('simple,,,string', ',')).toEqual(['simple', '', '', 'string']);

      // only cares about specific delimeter
      expect(escapeAwareSplit('super.simple,string', '.')).toEqual(['super', 'simple,string']);

      // skips escaped delimeter
      expect(escapeAwareSplit('simple\\\\,string', ',')).toEqual(['simple\\\\', 'string']);
    });
  });

  describe('spliting reserved parameters', () => {
    it('correctly splits reserved parameters containing multiple values', () => {
      expect(splitReservedParameters({ _type: 'uint256' })).toEqual([{ _type: 'uint256' }]);
      expect(splitReservedParameters({ _type: 'uint256,string', _path: 'key,anotherKey' })).toEqual([
        { _type: 'uint256', _path: 'key' },
        { _type: 'string', _path: 'anotherKey' },
      ]);
      expect(splitReservedParameters({ _type: 'uint256, invalid' })).toEqual([
        { _type: 'uint256' },
        { _type: ' invalid' },
      ]);
      expect(splitReservedParameters({ _type: 'uint256,,,invalid' })).toEqual([
        { _type: 'uint256' },
        { _type: '' },
        { _type: '' },
        { _type: 'invalid' },
      ]);
      expect(splitReservedParameters({ _type: 'uint256,string,bytes', _path: 'usd,,' })).toEqual([
        { _type: 'uint256', _path: 'usd' },
        { _type: 'string', _path: '' },
        { _type: 'bytes', _path: '' },
      ]);
      expect(splitReservedParameters({ _type: 'uint256', _times: '100' })).toEqual([
        { _type: 'uint256', _times: '100' },
      ]);
    });

    it('throws when there are different number of splits', () => {
      expect(() => splitReservedParameters({ _type: 'uint256', _path: 'usd,eur' })).toThrow(
        `Unexpected number of parsed reserved parameters. Number of "_types" parameters = 1, but "_path" has only 2`
      );
      expect(() => splitReservedParameters({ _type: 'uint256,', _path: 'usd' })).toThrow(
        'Unexpected number of parsed reserved parameters. Number of "_types" parameters = 2, but "_path" has only 1'
      );
      expect(() => splitReservedParameters({ _type: 'uint256,,', _path: 'usd,' })).toThrow(
        'Unexpected number of parsed reserved parameters. Number of "_types" parameters = 3, but "_path" has only 2'
      );
      expect(() => splitReservedParameters({ _path: 'strange\\.key', _type: 'string,address' })).toThrow(
        'Unexpected number of parsed reserved parameters. Number of "_types" parameters = 2, but "_path" has only 1'
      );
    });

    it('respects escaping', () => {
      expect(splitReservedParameters({ _type: 'address\\,bytes32' })).toEqual([{ _type: 'address,bytes32' }]);
      expect(splitReservedParameters({ _path: 'strange\\.key', _type: 'string' })).toEqual([
        { _type: 'string', _path: 'strange\\.key' },
      ]);
    });
  });
});
