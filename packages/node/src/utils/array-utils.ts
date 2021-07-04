export function updateArrayAt<T>(array: readonly T[], index: number, mapperFn: (T: any) => T): readonly T[] {
  const newValue = mapperFn(array[index]);
  return Object.assign([], array, { [index]: newValue });
}
