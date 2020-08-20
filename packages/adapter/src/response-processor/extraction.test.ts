import { getRawValue } from './extraction';

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
});
