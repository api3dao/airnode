// Adapted from:
// https://github.com/then/is-promise
export function isPromise(obj: any) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

function syncResolve(fn: any) {
  try {
    return [null, fn()];
  } catch (err) {
    return [err, null];
  }
}

// Go style async handling
export function go(fn: any) {
  const successFn = function (value: any) {
    return [null, value];
  };
  const errorFn = function (err: Error) {
    return [err, null];
  };

  if (isPromise(fn)) {
    return fn.then(successFn, errorFn);
  }
  return syncResolve(fn);
}
