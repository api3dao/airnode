import { TimeoutError } from 'bluebird';
import { go, goTimeout, promiseTimeout, retryOperation } from './promise-utils';

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
    const res = await goTimeout(10, successFn);
    expect(res).toEqual([null, 2]);
  });

  it('resolves unsuccessful asynchronous functions', async () => {
    const err = new Error('Computer says no');
    const errorFn = new Promise((_res, rej) => rej(err));
    const res = await goTimeout(10, errorFn);
    expect(res).toEqual([err, null]);
  });

  it('resolves promises that have timed out', async () => {
    const fn = new Promise((res) => {
      setTimeout(() => res("Won't be reached"), 20);
    });
    const res = await goTimeout(10, fn);
    expect(res).toEqual([new TimeoutError('operation timed out'), null]);
  });
});

describe('promiseTimeout', () => {
  it('rejects the promise if it fails to complete within the time limit', async () => {
    expect.assertions(1);
    const fn = new Promise((res) => {
      setTimeout(() => res("Won't be reached"), 20);
    });
    try {
      await promiseTimeout(10, fn);
    } catch (e) {
      expect(e).toEqual(new TimeoutError('operation timed out'));
    }
  });
});

describe('retryOperation', () => {
  it('resolves if the first call succeeds', async () => {
    const operation = { perform: () => Promise.resolve(200) };
    const spy = jest.spyOn(operation, 'perform');
    const res = await retryOperation(2, operation.perform, { timeouts: [50, 50] });
    expect(res).toEqual(200);
    expect(spy).toHaveReturnedTimes(1);
  });

  it('retries the specified number of times', async () => {
    const operation = { perform: () => Promise.resolve(200) };
    const spy = jest.spyOn(operation, 'perform');
    spy.mockRejectedValueOnce(new Error('First Fail'));
    spy.mockRejectedValueOnce(new Error('Second Fail'));
    spy.mockResolvedValueOnce(500);

    const res = await retryOperation(3, operation.perform, { timeouts: [50, 50, 50] });
    expect(res).toEqual(500);
    expect(spy).toHaveReturnedTimes(3);
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
    expect(spy).toHaveReturnedTimes(3);
  });
});
