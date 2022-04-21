import { go, promiseTimeout, retryOnTimeout, retryOperation } from './promise';

describe('go', () => {
  it('resolves successful asynchronous functions', async () => {
    const successFn = new Promise((res) => res(2));
    const res = await go(() => successFn);
    expect(res).toEqual([null, 2]);
  });

  it('resolves unsuccessful asynchronous functions', async () => {
    const err = new Error('Computer says no');
    const errorFn = new Promise((_res, rej) => rej(err));
    const res = await go(() => errorFn);
    expect(res).toEqual([err, null]);
  });
});

describe('promiseTimeout', () => {
  it('rejects the promise if it fails to complete within the time limit', async () => {
    const fn = new Promise((res) => {
      setTimeout(() => res("Won't be reached"), 20);
    });
    await expect(promiseTimeout(15, fn)).rejects.toThrow('Operation timed out');
  });
});

describe('retryOperation', () => {
  it('resolves if the first call succeeds', async () => {
    const operation = { perform: () => Promise.resolve(200) };
    const spy = jest.spyOn(operation, 'perform');
    const res = await retryOperation(operation.perform, { retries: 1, timeoutMs: 50 });
    expect(res).toEqual(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('retries the specified number of times', async () => {
    const operation = { perform: () => Promise.resolve(200) };
    const spy = jest.spyOn(operation, 'perform');
    spy.mockRejectedValueOnce(new Error('First Fail'));
    spy.mockRejectedValueOnce(new Error('Second Fail'));
    spy.mockResolvedValueOnce(500);

    const res = await retryOperation(operation.perform, { retries: 2, timeoutMs: 50 });
    expect(res).toEqual(500);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('rejects if all retries are exhausted', async () => {
    const operation = { perform: () => Promise.resolve(200) };
    const spy = jest.spyOn(operation, 'perform');
    spy.mockRejectedValueOnce(new Error('First Fail'));
    spy.mockRejectedValueOnce(new Error('Second Fail'));
    spy.mockRejectedValueOnce(new Error('Third Fail'));

    await expect(retryOperation(operation.perform, { retries: 2, timeoutMs: 50 })).rejects.toThrow('Third Fail');
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
    const operation = { perform: () => Promise.reject(new Error('First fail')) };
    const spy = jest.spyOn(operation, 'perform');
    await expect(retryOnTimeout(50, operation.perform, { delay: 10 })).rejects.toThrow('First fail');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('retries on timeout until the maximum timeout is reached', async () => {
    const operation = { perform: () => Promise.reject(new Error('Operation timed out')) };
    const spy = jest.spyOn(operation, 'perform');
    await expect(retryOnTimeout(50, operation.perform, { delay: 2 })).rejects.toThrow('Operation timed out');
    expect(spy.mock.calls.length).toBeGreaterThan(5);
    expect(spy.mock.calls.length).toBeLessThan(30);
  });
});
