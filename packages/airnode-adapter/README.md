# @api3/airnode-adapter

The adapter package for @api3 contains logic for building requests from an
[Oracle Integration Specification (OIS)](https://docs.api3.org/airnode/v0.2/grp-providers/guides/build-an-airnode/api-integration.html#ois-template),
executing those requests and returning a single value from the response.

## Getting Started

You can install `@api3/airnode-adapter` by adding it to the `package.json` file in your project.

```sh
# NPM
npm install --save @api3/airnode-adapter

# Yarn
yarn add @api3/airnode-adapter
```

## Types

You can find the types mentioned below in
[src/types.ts](https://github.com/api3dao/airnode/blob/master/packages/airnode-adapter/src/types.ts)

## API

Available functions:

- [buildRequest](#buildRequest)

- [executeRequest](#executeRequest)

- [buildAndExecuteRequest](#buildAndExecuteRequest)

- [extractValue](#extractValue)

- [castValue](#castValue)

- [multiplyValue](#multiplyValue)

- [encodeValue](#encodeValue)

- [extractAndEncodeResponse](#extractAndEncodeResponse)

### buildRequest

Builds a request object based on the OIS, endpointName, (user) parameters and securitySchemes. The request contains all
of the necessary details for making a request

```ts
buildRequest(options: Options): Request
```

### executeRequest

Executes a request. `config` is an optional argument that provides extra details on how the request should execute, such
as a timeout.

[axios](https://github.com/axios/axios) is used for executing requests under the hood. You can use your own HTTP library
by building the request separately and using the result.

```ts
executeRequest(request: Request, config?: Config): AxiosPromise<any>
```

### buildAndExecuteRequest

Builds and executes a request in a single call as a convenience function.

```ts
buildAndExecuteRequest(options: Options, config?: Config): AxiosPromise<any>
```

### extractValue

Fetches a single value from an arbitrarily complex object or array using `path`. This works in exactly the same way as
lodash's [get](https://lodash.com/docs/4.17.15#get) function. **Values are accessed by either keys or indices, separated
by `.`**

For example, `a.3` would fetch the value of the 4th element (15) from the `a` key of an object has the shape:
`{ a: [12, 13, 14, 15] }`.

Some APIs return a single, primitive value like a string, number or boolean - not an object or array. This is still
considered valid JSON. When this is the case, leave the `path` argument out to return the entire response.

```ts
extractValue(data: unknown, path?: string): any
```

### castValue

**NB: See below for conversion behaviour**

Attempts to cast and normalize an input value based on the `type` argument. An error is thrown if the value cannot be
converted.

The following options are available for `type`:

1. `bool` converts to boolean
2. `int256` converts to [BigNumber](https://docs.ethers.io/v5/api/utils/bignumber/)
3. `bytes32` converts to string

```ts
castValue(value: unknown, type: ResponseType): string | boolean | BigNumber
```

### multiplyValue

Multiplies the input value by the `times` parameter. Returns the input value as is if `times` is undefined.

**NB: ALL REMAINING DECIMAL PLACES WILL BE REMOVED. i.e. THE NUMBER WILL BE FLOORED**. This is necessary because
Solidity cannot natively handle floating point or decimal numbers.

```ts
multiplyValue(value: string, times?: string): string
```

### encodeValue

Encodes the input value to `bytes32` format. Values are padded if necessary to be 32 characters long. Encoding is based
on the `type` argument.

```ts
encodeValue(value: ValueType, type: ResponseType): string
```

### extractAndEncodeResponse

Extracts, casts, multiplies (if necessary) and encodes an arbitrary input in a single call as a convenience function.

```ts
extractAndEncodeResponse(data: unknown, parameters: ReservedParameters): any
```

## Conversion Behaviour

There are a few important behaviours to need to be noted when converting to various response types. The response values
in the examples are the values after extracting from the response payload using the path.

### `bool` Behaviour

The following response values in the example are all considered `false`.

**ALL other values are converted to `true`**.

```ts
const FALSE_BOOLEAN_VALUES = [0, '0', false, 'false', undefined, null];

const values = FALSE_BOOLEAN_VALUES.map((v) => {
  return adapter.castValue(v, 'bool');
});

console.log(values);
// [false, false, false, false, false, false];
```

### `int256` Behaviour

The response values in the following example will result in an error:

```ts
// ALL OF THESE VALUES THROW ERRORS
const ERROR_VALUES = [
  null,
  undefined,
  Infinity,
  NaN,
  '', // empty string
  'randomstring',
  [], // arrays of any kind
  {}, // objects of any kind
];
```

There are a few special strings & boolean values that are convertible to `int256`:

```ts
const SPECIAL_INT_VALUES = [false, 'false', true, 'true'];

const values = SPECIAL_INT_VALUES.map((v) => adapter.castValue(v, 'int256'));
console.log(values);
// [0, 0, 1, 1];
```

Number strings and numbers will attempt to be converted to [BigNumbers](https://mikemcl.github.io/bignumber.js/). The
value will also be multiplied by the `times` value if it is present.

```ts
const VALID_INT_VALUES = ['123.456', 7777];

const values = VALID_INT_VALUES.map((v) => adapter.castValue(v, 'int256'));
console.log(values);
// [new BigNumber(123.456), new BigNumber(7777)];
```

**NB:** It is also important to note, that when a number value is multiplied (e.g. providing a `_times` to
`extractAndEncodeResponse`), **ALL REMAINING DECIMALS WILL BE REMOVED. i.e. THE NUMBER WILL BE FLOORED**. This is
because Solidity cannot handle floating point numbers or decimals natively.

### `bytes32` Behaviour

If the response value is an object, an error will be thrown when attempting to convert to `bytes32`.

```ts
const ERROR_VALUES = [{}, { a: 1 }, [], ['somestring'], [{ a: 1 }]];

const VALID_BYTES_VALUES = [
  null,
  undefined,
  '', // empty string
  'random string',
  777, // numbers
  true, // booleans
];

const values = VALID_INT_VALUES.map((v) => adapter.castValue(v, 'bytes32'));
console.log(values);
// ["null", "undefined", "", "random string", "1", "777", "true"];
```

## Example

```ts
import * as adapter from '@api3/airnode-adapter';

const options = {
  ois: { ... }, // a valid OIS object
  endpointName: 'myUniqueEndpointName',
  parameters: { from: 'BTC', to: 'USD' },
  credentials: { securityScheme: 'My Security Scheme', value: 'supersecret' },
};
const request = adapter.buildRequest(options);

const response = await adapter.executeRequest(request);

// Say the response payload that gets returned looks like:
const data = {
  prices: [1000.23, 750.51, 950.97],
  symbol: 'BTC_USD',
};

// Option 1:
const rawValue = adapter.extractValue(data, 'prices.1');
const value = adapter.castValue(rawValue, 'int256');
const multipledValue = adapter.multiplyValue(value, '100');
const encodedValue = adapter.encodeValue(multipledValue, 'int256');
console.log(encodedValue);
// '0x000000000000000000000000000000000000000000000000000000000001252b'

// Option 2:
const parameters = {
  path: 'prices.1',
  times: '100',
  type: 'int256',
};
const result = adapter.extractAndEncodeResponse(data, parameters);
console.log(result);
//  {
//    value: 75051,
//    encodedValue: '0x000000000000000000000000000000000000000000000000000000000001252b'
//  }
```
