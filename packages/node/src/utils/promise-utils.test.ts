import { go, goTimeout, promiseTimeout, retryOnTimeout, retryOperation } from './promise-utils';

describe('go', () => {
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

describe('goTimeout', () => {
  it('resolves successful asynchronous functions', async () => {
    const successFn = new Promise((res) => res(2));
    const res = await goTimeout(15, successFn);
    expect(res).toEqual([null, 2]);
  });

  it('resolves unsuccessful asynchronous functions', async () => {
    const err = new Error('Computer says no');
    const errorFn = new Promise((_res, rej) => rej(err));
    const res = await goTimeout(15, errorFn);
    expect(res).toEqual([err, null]);
  });

  it('resolves promises that have timed out', async () => {
    const fn = new Promise((res) => {
      setTimeout(() => res("Won't be reached"), 20);
    });
    const [err, res] = await goTimeout(15, fn);
    expect(res).toEqual(null);
    expect(err?.message).toContain('Operation timed out');
  });
});

describe('promiseTimeout', () => {
  it('rejects the promise if it fails to complete within the time limit', async () => {
    expect.assertions(1);
    const fn = new Promise((res) => {
      setTimeout(() => res("Won't be reached"), 20);
    });
    try {
      await promiseTimeout(15, fn);
    } catch (e) {
      expect(e.message).toContain('Operation timed out');
    }
  });
});

describe('retryOperation', () => {
  it('resolves if the first call succeeds', async () => {
    const operation = { perform: () => Promise.resolve(200) };
    const spy = jest.spyOn(operation, 'perform');
    const res = await retryOperation(2, operation.perform, { timeouts: [50, 50] });
    expect(res).toEqual(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('retries the specified number of times', async () => {
    const operation = { perform: () => Promise.resolve(200) };
    const spy = jest.spyOn(operation, 'perform');
    spy.mockRejectedValueOnce(new Error('First Fail'));
    spy.mockRejectedValueOnce(new Error('Second Fail'));
    spy.mockResolvedValueOnce(500);

    const res = await retryOperation(3, operation.perform, { timeouts: [50, 50, 50] });
    expect(res).toEqual(500);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('rejects if all retries are exhausted', async () => {
    expect.assertions(2);

    const operation = { perform: () => Promise.resolve(200) };
    const spy = jest.spyOn(operation, 'perform');
    spy.mockRejectedValueOnce(new Error('First Fail'));
    spy.mockRejectedValueOnce(new Error('Second Fail'));
    spy.mockRejectedValueOnce(new Error('Third Fail'));

    try {
      await retryOperation(3, operation.perform, { timeouts: [50, 50, 50] });
    } catch (e) {
      expect(e).toEqual(new Error('Third Fail'));
    }
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe('retryOnTimeout', () => {
  it('resolves immediately if the promise is successful', async () => {
    const operation = { perform: () => Promise.resolve(true) };
    const spy = jest.spyOn(operation, 'perform');
    const res = await retryOnTimeout(50, operation.perform, { delay: 10 });
    expect(res).toEqual(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('rejects immediately if the promise is successful', async () => {
    expect.assertions(2);

    const operation = { perform: () => Promise.reject(new Error('First fail')) };
    const spy = jest.spyOn(operation, 'perform');
    try {
      await retryOnTimeout(50, operation.perform, { delay: 10 });
    } catch (e) {
      expect(e).toEqual(new Error('First fail'));
    }
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('retries on timeout until the maximum timeout is reached', async () => {
    expect.assertions(3);

    const operation = { perform: () => Promise.reject(new Error('Operation timed out')) };
    const spy = jest.spyOn(operation, 'perform');

    try {
      await retryOnTimeout(50, operation.perform, { delay: 2 });
    } catch (e) {
      expect(e.message).toContain('Operation timed out');
    }
    expect(spy.mock.calls.length).toBeGreaterThan(5);
    expect(spy.mock.calls.length).toBeLessThan(30);
  });
});
