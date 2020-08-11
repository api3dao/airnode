export function updateArrayAt<T>(array: T[], index: number, mapperFn: (T: any) => T) {
  const newValue = mapperFn(array[index]);
  return Object.assign([], array, { [index]: newValue });
}
