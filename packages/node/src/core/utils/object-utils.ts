interface AnyObject {
  [key: string]: any;
}

// lodash has an 'omit' function but it's quite slow
export function removeKey(obj: AnyObject, key: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [key]: omit, ...rest } = obj;
  return rest;
}
