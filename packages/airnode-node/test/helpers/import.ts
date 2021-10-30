import isNil from 'lodash/isNil';

export const orDie = (arg: any) => {
  if (isNil(arg)) {
    throw new Error(`Argument is empty`);
  }
  return arg;
};

// Sometimes Jest can have issues when trying to spy on an internal module. Import
// and use this function as a workaround at the top of your test.
//
// Credit: https://github.com/facebook/jest/issues/6914#issuecomment-654710111
export const unfreezeImport = <T>(module: T, key: keyof T) => {
  const meta = orDie(Object.getOwnPropertyDescriptor(module, key));
  const getter = orDie(meta.get);

  const originalValue = getter() as T[typeof key];
  let mutableCurrentValue = originalValue;
  let mutableIsMocked = false;

  Object.defineProperty(module, key, {
    ...meta,
    get: () => (mutableIsMocked ? mutableCurrentValue : getter()),
    set(newValue: T[typeof key]) {
      mutableIsMocked = newValue !== originalValue;
      mutableCurrentValue = newValue;
    },
  });
};
