import * as utils from './array';

describe('updateArrayAt', () => {
  it('updates the element at the given index', () => {
    const arr = [
      { a: 1, b: 2 },
      { a: 1, b: 2 },
    ];
    const res = utils.updateArrayAt(arr, 1, (element) => ({ ...element, a: element.a + 2 }));
    expect(res).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 2 },
    ]);
  });
});
