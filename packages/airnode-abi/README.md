# Monorepo version: `@airnode/airnode-abi`
# Stand-alone version: `@api3/airnode-abi`

> Encoding and decoding utilities intended for use with Airnode

## Description

Airnode-ABI provides a unique way to encode and decode parameters. Parameters are provided with encoding types, names and values. The types are shortened and grouped with a version as the "header". The name/value pairs are then grouped and encoded as the rest of the body.

An advantage of encoding parameters this way is that parameters can be decoded natively using the language(s) of the specific blockchain. In the case of EVM blockchains, this means that parameters can be encoded as well as decoded in Solidity (or Vyper), without any additional requirements.

You can find additional documentation in the [Airnode ABI specifications](https://github.com/api3dao/api3-docs/blob/master/airnode/airnode-abi-specifications.md)

## Installation

You can install with either [npm](https://docs.npmjs.com/getting-started/installing-node#install-npm--manage-npm-versions) or [Yarn](https://yarnpkg.com/en/docs/install)

```sh
# npm
npm install --save @airnode/airnode-abi

# Yarn
yarn add @airnode/airnode-abi
```

## Usage

### Encoding

`encode` accepts an array of objects with the following required keys:

1. `type` - The full list of accepted types can be found in the [specifications](https://github.com/api3dao/api3-docs/blob/master/airnode/airnode-abi-specifications.md#type-encodings)

2. `name`

3. `value`

It is important to note that numeric values (`int256` and `uint256`) should be submitted as **strings** in order to preserve precision.

```ts
import { encode } from '@airnode/airnode-abi';

const parameters = [
  { type: 'bytes32', name: 'from', value: 'ETH' },
  { type: 'uint256', name: 'amount', value: '100000' },
];
const encodedData = encode(parameters);

console.log(encodedData);
// '0x...'
```

### Decoding

Decoding returns an object where the keys are the "names" and the values are the "values" from the initial encoding.

It is important to note that `int256` and `uint256` will be decoded back to strings.

```ts
import { decode } from '@airnode/airnode-abi';

const encodedData = '0x...';
const decoded = decode(encodedData);

console.log(decoded);
// { from: 'ETH', amount: ethers.BigNumber.from('100000') }
```
