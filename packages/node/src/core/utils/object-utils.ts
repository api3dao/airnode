interface AnyObject {
  [key: string]: any;
}

export function removeKey(obj: AnyObject, key: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [key]: omit, ...rest } = obj;
  return rest;
}
