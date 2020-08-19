import { getRawValue } from './extraction';

describe('getRawValue', () => {
  it('returns the data as is if no path is provided', () => {
    const obj = 'somevalue';
    expect(getRawValue(obj)).toEqual('somevalue');
  });

  it('gets the value from a deeply nested object', () => {
    const obj = { a: { b: [{ c: 1 }, { d: 5 }] } };
    expect(getRawValue(obj, 'a.b.1.d')).toEqual(5);
  });

  it('gets the value from an array', () => {
    const obj = [
      { values: [422, 413, 401] },
      { values: [731, 728, 739] },
    ];
    expect(getRawValue(obj, '1.values.2')).toEqual(739);
  });

  it('prefers the value from the array an ambiguous object', () => {
    const obj = {
      'foo.bar.0': { baz: 555 },
      foo: { bar: [{ baz: 888 }] }
    };
    expect(getRawValue(obj, 'foo.bar.0.baz')).toEqual(888);
  });

  it('returns the default value if unable to find the specified value', () => {
    const obj = { a: 1 };
    expect(getRawValue(obj, 'unknown', 'default')).toEqual('default');
  });
});
