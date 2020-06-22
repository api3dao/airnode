import { go } from './promise-utils';

describe('go', () => {
  it('resolves successful synchronous functions', () => {
    const successFn = () => 1 + 1;
    expect(go(successFn)).toEqual([null, 2]);
  });

  it('resolves unsuccessful synchronous functions', () => {
    const err = new Error('Computer says no');
    const errorFn = () => {
      throw err;
    };
    expect(go(errorFn)).toEqual([err, null]);
  });

  it('resolves successful asynchronous functions', async () => {
    const successFn = new Promise((res) => res(2));
    const res = await go(successFn);
    expect(res).toEqual([null, 2]);
  });

  it('resolves unsuccessful asynchronous functions', async () => {
    const err = new Error('Computer says no');
    const errorFn = new Promise((_res, rej) => rej(err));
    const res = await go(errorFn);
    expect(res).toEqual([err, null]);
  });
});
