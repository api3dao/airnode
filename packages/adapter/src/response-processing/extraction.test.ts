import * as extraction from './extraction';
import { ResponseParameters } from '../types';

describe('getRawValue', () => {
  it('returns the data as is if no path is provided', () => {
    expect(extraction.getRawValue('somevalue')).toEqual('somevalue');
    expect(extraction.getRawValue(false)).toEqual(false);
    expect(extraction.getRawValue(500)).toEqual(500);
  });

  it('gets the value from a deeply nested object path', () => {
    const obj = { a: { b: [{ c: 1 }, { d: 5 }] } };
    expect(extraction.getRawValue(obj, 'a.b.1.d')).toEqual(5);
  });

  it('gets the value from an array path', () => {
    const obj = [{ values: [422, 413, 401] }, { values: [731, 728, 739] }];
    expect(extraction.getRawValue(obj, '1.values.2')).toEqual(739);
  });

  it('prefers the nested value from an ambiguous object', () => {
    const obj = {
      'foo.bar.0': { baz: 555 },
      foo: { bar: [{ baz: 888 }] },
    };
    expect(extraction.getRawValue(obj, 'foo.bar.0.baz')).toEqual(888);
  });

  it('returns undefined if the value cannot be found', () => {
    const obj = { a: 1 };
    expect(extraction.getRawValue(obj, 'unknown')).toEqual(undefined);
  });

  it('returns the default value if unable to find the specified value', () => {
    const obj = { a: 1 };
    expect(extraction.getRawValue(obj, 'unknown', 'default')).toEqual('default');
  });
});

describe('extractValue', () => {
  it('returns the extracted value', () => {
    const obj = { a: { b: [{ c: 1 }, { d: 5 }] } };
    expect(extraction.extractValue(obj, 'a.b.1.d')).toEqual(5);
  });

  it('throws an error if a value cannot be found', () => {
    expect.assertions(1);
    const obj = { a: 1 };
    try {
      extraction.extractValue(obj, 'unknown');
    } catch (e) {
      expect(e).toEqual(new Error("Unable to find value from path: 'unknown'"));
    }
  });
});

describe('extractAndEncodeValue', () => {
  it('returns a simple value with the encodedValue', () => {
    const res = extraction.extractAndEncodeResponse('simplestring', { _type: 'bytes32' });
    expect(res).toEqual({
      value: 'simplestring',
      encodedValue: '0x73696d706c65737472696e670000000000000000000000000000000000000000',
    });
  });

  it('extracts and encodes the value from complex objects', () => {
    const data = { a: { b: [{ c: 1 }, { d: '750.51' }] } };
    const parameters: ResponseParameters = { _path: 'a.b.1.d', _type: 'int256', _times: '100' };
    const res = extraction.extractAndEncodeResponse(data, parameters);
    expect(res).toEqual({
      value: '75051',
      encodedValue: '0x000000000000000000000000000000000000000000000000000000000001252b',
    });
  });
});
