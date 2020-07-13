import Bluebird from 'bluebird';

// http://bluebirdjs.com/docs/api/promise.config.html
Bluebird.config({
  cancellation: true,
});

// Adapted from:
// https://github.com/then/is-promise
export function isPromise(obj: any) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

type Response<T> = [Error, null] | [null, T];

// Go style async handling
export function go<T>(fn: Promise<T>): Promise<Response<T>> {
  const successFn = (value: T): [null, T] => {
    return [null, value];
  };
  const errorFn = (err: Error): [Error, null] => {
    return [err, null];
  };

  return fn.then(successFn).catch(errorFn);
}

export function goTimeout<T>(ms: number, fn: Promise<T>): Promise<Response<T>> {
  return go(promiseTimeout(ms, fn));
}

// A native implementation of the following function might look like:
//
//   function promiseTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
//     const timeout = new Promise((_res, reject) => {
//       setTimeout(() => {
//         reject(new Error(`Timed out in ${ms} ms.`));
//       }, ms);
//     });
//     return Promise.race([promise, timeout]);
//   }
//
// The problem with this is that that the slow promise still runs until it resolves.
// This means that the serverless function will not exit until the entire timeout
// duration has been reached which is a problem.
export function promiseTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return Bluebird.resolve(promise).timeout(ms);
}
