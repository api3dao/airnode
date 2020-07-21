import * as utils from './object-utils';

describe('removeKey', () => {
  it('returns the object without the specified key', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(utils.removeKey(obj, 'b')).toEqual({ a: 1, c: 3 });
  });

  it('returns the object as is if the key is not found', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(utils.removeKey(obj, 'd')).toEqual({ a: 1, b: 2, c: 3 });
  });
});
