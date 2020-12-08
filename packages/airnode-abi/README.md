# @airnode/airnode-abi

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

**NB:** The `types`, `names` and `values` array inputs must all have the same number of elements

You can find a full list of supported types in the [Airnode ABI specifications](https://github.com/api3dao/api3-docs/blob/master/airnode/airnode-abi-specifications.md#type-encodings). Submitting an unsupported type will result in an error.

`int256` and `uint256` values can be submitted as either strings or [ethers BigNumber](https://docs.ethers.io/v5/api/utils/bignumber/) values.

```ts
import { encode } from '@airnode/airnode-abi';

const types = ['bytes32', 'uint256'];
const names = ['from', 'amount'];
const values = ['ETH', '100000'];
const encoded = encode(types, names, values);

console.log(encoded);
// '0x...'
```

### Decoding

Decoding returns an object where the keys are the "names" and the values are the "values" from the initial encoding.

It is important to note that `int256` and `uint256` types are returned as [ethers BigNumbers](https://docs.ethers.io/v5/api/utils/bignumber/). This is done to preserve precision. These values can be converted to strings if necessary using `.toString()`. See the [BigNumber](https://docs.ethers.io/v5/api/utils/bignumber/) docs for more information.

```ts
import { decode } from '@airnode/airnode-abi';

const encodedData = '0x...';
const decoded = decode(encodedData);

console.log(decoded);
// { from: 'ETH', amount: ethers.BigNumber.from('100000') }
```

## Security

API3 and Airnode take security very seriously. If you find a security related bug please let the team know privately.

## Contributing

Airnode welcomes all contributors, regardless of how big or small the change is!

If you find a bug, please log an [issue](https://github.com/api3dao/api3-docs)
