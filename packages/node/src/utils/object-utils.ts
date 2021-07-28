interface AnyObject {
  readonly [key: string]: any;
}

export function removeKeys(obj: AnyObject, keys: readonly string[]) {
  return keys.reduce((acc, key) => {
    return removeKey(acc, key);
  }, obj);
}

// lodash has an 'omit' function but it's quite slow
export function removeKey(obj: AnyObject, key: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [key]: omit, ...rest } = obj;
  return rest;
}
