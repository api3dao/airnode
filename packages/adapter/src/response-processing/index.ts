export * from './casting';
export * from './encoding';
export * from './extraction';

// export function isNumberType(type: ResponseType) {
//   return type === 'int256';
// }
//
// export function processByExtracting(data: unknown, path?: string) {
//   const rawValue = extraction.getRawValue(data, path);
//
//   if (isUndefined(rawValue)) {
//     throw new Error(`Unable to find value from path: '${path}'`);
//   }
//
//   return rawValue;
// }
//
// export function processByCasting(rawValue: unknown, type: ResponseType) {
//   return caster.castValue(rawValue, type);
// }
//
// export function processByMultiplying(value: BigNumber, times?: number | string): string {
//   if (!times) {
//     const stringifiedNumber = caster.bigNumberToString(value);
//     return caster.floorStringifiedNumber(stringifiedNumber);
//   }
//   return caster.multiplyValue(value, times);
// }

// export function processByEncoding(value: ValueType, type: ResponseType) {
//   // NOTE: value should be in the matching type at this point
//   switch (type) {
//     case 'int256':
//       return encoder.convertNumberToBytes32(value as string);
//
//     case 'bool':
//       return encoder.convertBoolToBytes32(value as boolean);
//
//     case 'bytes32':
//       return encoder.convertStringToBytes32(value as string);
//   }
// }
