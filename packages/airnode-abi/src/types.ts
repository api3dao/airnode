export type ABIParameterType = 'address' | 'bytes' | 'bytes32' | 'int256' | 'uint256' | 'string';

// Upper case letters refer to dynamically sized types
// Lower case letters refer to statically sized types
export type ABIParameterTypeShort = 'a' | 'B' | 'b' | 'i' | 'u' | 'S';

export interface DecodedMap {
  readonly [key: string]: string;
}

export interface InputParameter {
  readonly name: string;
  readonly type: string;
  readonly value: string;
}
