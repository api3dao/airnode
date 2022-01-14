export type ABIParameterType = 'address' | 'bytes' | 'bool' | 'int256' | 'uint256' | 'string' | 'bytes32';

// Upper case letters refer to dynamically sized types, lower case letters refer to statically sized types
export type ABIParameterTypeShort = 'a' | 'B' | 'b' | 'i' | 'u' | 'S' | 's';

export interface DecodedMap {
  readonly [key: string]: string;
}

export interface InputParameter {
  readonly name: string;
  // NOTE: The only possible values are from ABIParameterType, but typing it like this in TS would require writing many
  // "as const" so it is not worth doing.
  readonly type: string;
  readonly value: unknown;
}
