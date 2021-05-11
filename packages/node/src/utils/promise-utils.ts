import Bluebird from 'bluebird';
import { DEFAULT_RETRY_OPERATION_TIMEOUT_MS } from '../constants';

// Adapted from:
// https://github.com/then/is-promise
export function isPromise(obj: any) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

type Response<T> = [Error, null] | [null, T];

export interface PromiseOptions {
  retries?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

export interface RetryOptions extends PromiseOptions {
  retries: number;
}

// Go style async handling
export function go<T>(fn: () => Promise<T>, options?: PromiseOptions): Promise<Response<T>> {
  function successFn(value: T): [null, T] {
    return [null, value];
  }
  function errorFn(err: Error): [Error, null] {
    return [err, null];
  }

  if (options?.retries) {
    const optionsWithRetries = { ...options, retries: options.retries! };
    return retryOperation(fn, optionsWithRetries).then(successFn).catch(errorFn);
  }

  if (options?.timeoutMs) {
    return promiseTimeout(options.timeoutMs, fn()).then(successFn).catch(errorFn);
  }

  return fn().then(successFn).catch(errorFn);
}

export function retryOperation<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const timeout = options?.timeoutMs || DEFAULT_RETRY_OPERATION_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    // Wrap the original operation in a timeout
    const execution = promiseTimeout(timeout, operation());

    // If the promise is successful, resolve it and bubble the result up
    return execution.then(resolve).catch((reason: any) => {
      // If there are any retries left, we call the same retryOperation function again,
      // but decrementing the number of retries left by 1
      if (options.retries > 0) {
        // Delay the new attempt slightly
        return wait(options.retryDelay || 50)
          .then(retryOperation.bind(null, operation, { ...options, retries: options.retries - 1 }))
          .then((res) => resolve(res as T))
          .catch(reject);
      }
      // Reject (and bubble the result up) if there are no more retries
      return reject(reason);
    });
  });
}

export interface ContinuousRetryOptions {
  delay?: number;
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

export function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function retryOnTimeout<T>(maxTimeoutMs: number, operation: () => Promise<T>, options?: ContinuousRetryOptions) {
  const promise = new Promise((resolve, reject) => {
    function run(): Promise<void> {
      // If the promise is successful, resolve it and bubble the result up
      return operation()
        .then(resolve)
        .catch((reason: any) => {
          // Only if the error is a timeout error, do we retry the promise
          if (reason instanceof Error && reason.message === 'operation timed out') {
            // Delay the new attempt slightly
            return wait(options?.delay || 50)
              .then(run)
              .then(resolve)
              .catch(reject);
          }

          // If the error is NOT a timeout error, then we reject immediately
          return reject(reason);
        });
    }

    return run();
  });

  return promiseTimeout(maxTimeoutMs, promise);
}
