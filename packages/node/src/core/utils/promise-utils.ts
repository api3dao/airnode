// Adapted from:
// https://github.com/then/is-promise
export function isPromise(obj: any) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

type Response<T> = [Error, null] | [null, T];

function syncResolve<T>(fn: any): Response<T> {
  try {
    return [null, fn()];
  } catch (err) {
    return [err, null];
  }
}

// Go style async handling
export function go<T>(fn: Promise<T>): Promise<Response<T>> | Response<T> {
  const successFn = (value: T): [null, T] => {
    return [null, value];
  };
  const errorFn = (err: Error): [Error, null] => {
    return [err, null];
  };

  if (isPromise(fn)) {
    return fn.then(successFn, errorFn);
  }
  return syncResolve(fn);
}
