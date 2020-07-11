# @airnode/adapter

The adapter package for @airnode contains logic for building requests from an [Oracle Integration Specification (OIS)](https://github.com/clc-group/airnode/wiki/OIS-v1.0.0), executing those requests and returning a single value from the response.

## Getting Started

You can install `@airnode/adapter` by adding it to the `package.json` file in your project.

```sh
# NPM
npm install --save @airnode/adapter

# Yarn
yarn add @airnode/adapter
```

## Types

You can find the types mentioned below in [src/types.ts](https://github.com/clc-group/airnode/blob/master/packages/adapter/src/types.ts)

## API

Available functions:

- [buildRequest](#buildRequest)

- [executeRequest](#executeRequest)

- [buildAndExecuteRequest](buildAndExecuteRequest)

- [extractResponseValue](#extractResponseValue)

- [castValue](#castValue)

- [multipleValue](#multipleValue)

- [encodeValue](#encodeValue)

- [extractAndEncodeResponse](#extractAndEncodeResponse)

### buildRequest

Builds a request object based on the OIS, endpointName, (user) parameters and securitySchemes. The request contains all of the necessary details for making a request

```ts
buildRequest(options: Options): Request
```

### executeRequest

Executes a request. `config` is an optional argument that provides extra details on how the request should execute, such as a timeout.

[axios](https://github.com/axios/axios) is used for executing requests under the hood. You can use your own HTTP library by building the request separately and using the result.

```ts
executeRequest(request: Request, config?: Config): AxiosPromise<any>
```

### buildAndExecuteRequest

Builds and executes a request in a single call as a convenience function.

```ts
buildAndExecuteRequest(options: Options, config?: Config): AxiosPromise<any>
```

### extractResponseValue

Fetches a single value from an arbitrarily complex object or array using `path`. This uses lodash [get](https://lodash.com/docs/4.17.15#get) under the hood, which works by accessing values by keys or indices separated by `.` values. e.g. `a.3` would fetch the value of the 4th element in the `a` key of an object.

If a path is not provided, the initial value is returned as is.

```ts
extractResponseValue(data: unknown, path: string): any
```

### castValue

**NB: See below for conversion behaviour**

Attempts to cast and normalize an input value based on the `type` argument. An error is thrown if the value cannot be converted.

The following options are available for `type`:

1. `bool` converts to boolean
2. `int256` converts to number
3. `bytes32` converts to string

```ts
castValue(value: unknown, type: ResponseType): string | boolean | number
```

### multiplyValue

Multiplies the input value by the `times` parameter. Returns the input value as is if `times` is undefined.

```ts
castValue(value: number, times?: number): number
```

### encodeValue

Encodes the input value to `bytes32` format. Values are padded if necessary to be 32 characters long

```ts
encodeValue(value: ValueType, type: ResponseType): string
```

### extractAndEncodeResponse

Extracts, casts, multiplies (if necessary) and encodes an arbitrary input in a single call as a convenience function.

```ts
extractAndEncodeResponse(data: unknown, parameters: ResponseParameters): any
```

## Conversion Behaviour

There are a few important behaviours to need to be noted when converting to various response types. The response values in the examples are the values after extracting from the response payload using the path.

### `bool` Behaviour

The following response values in the example are all considered `false`.

**ALL other values are converted to `true`**.

```ts
const FALSE_BOOLEAN_VALUES = [
  0,
  '0',
  false,
  'false',
  undefined,
  null
];

const values = FALSE_BOOLEAN_VALUES.map(v => {
  return adapter.castValue(v, 'bool');
});

console.log(values)
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

There are a few special strings & boolean values that are convertable to `int256`:

```ts
const SPECIAL_INT_VALUES = [false, 'false', true, 'true'];

const values = SPECIAL_INT_VALUES.map(v => adapter.castValue(v, 'int256'));
console.log(values)
// [0, 0, 1, 1];
```

Number strings (and numbers) will attempt to be converted to numbers. The value will also be multiplied by the `times` value if it is present.

```ts
const VALID_INT_VALUES = [
  '123.456',
  7777,
];

const values = VALID_INT_VALUES.map(v => adapter.castValue(v, 'int256'));
console.log(values)
// [123.456, 7777];
```

### `bytes32` Behaviour

If the response value is an object, an error will be thrown when attempting to convert to `bytes32`.

```ts
const ERROR_VALUES = [
  {},
  { a: 1 },
];

const VALID_BYTES_VALUES = [
  null,
  undefined,
  '', // empty string
  'random string',
  [1], // basic arrays
  777, // numbers
  true, // booleans
];

const values = VALID_INT_VALUES.map(v => adapter.castValue(v, 'bytes32'));
console.log(values)
// ["null", "undefined", "", "random string", "1", "777", "true"];
```

## Example

```ts
import * as adapter from '@airnode/adapter';

const options = {
  ois: { ... }, // a valid OIS object
  endpointName: 'myUniqueEndpointName',
  parameters: { from: 'BTC', to: 'USD' },
  securitySchemes: [
    { securitySchemeName: 'mySecurityScheme', value: 'supersecret' },
    { securitySchemeName: 'anotherScheme', value: 'anothersecret' },
  ]
};
const request = adapter.buildRequest(options);

const response = await adapter.executeRequest(request);

// Say the response payload that gets returned looks like:
const data = {
  prices: [1000.23, 750.51, 950.97],
  symbol: 'BTC_USD',
};

// Option 1:
const rawValue = adapter.extractResponseValue(data, 'prices.1');
const value = adapter.castValue(rawValue, 'int256');
const multipledValue = adapter.multiplyValue(value, 100);
const encodedValue = adapter.encodeValue(multipledValue, 'int256');
console.log(encodedValue);
// '0x000000000000000000000000000000000000000000000000000000000001252b'

// Option 2:
const parameters = {
  path: 'prices.1',
  times: 100,
  type: 'int256',
};
const result = adapter.extractAndEncodeResponse(data, parameters);
console.log(result);
//  {
//    value: 75051,
//    encodedValue: '0x000000000000000000000000000000000000000000000000000000000001252b'
//  }
```
