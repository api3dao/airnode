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

- [extractResponse](#extractResponse)

- [castResponse](#castResponse)

- [extractAndCastResponse](#extractAndCastResponse)

### buildRequest

Builds a request object based on the OIS, endpointName, (user) parameters and securitySchemes. The request contains all of the necessary details for making a request

```ts
buildRequest(options: Options): Request
```

### executeRequest

Executes a request. `config` is an optional argument that provides extra details on how the request should execute, such as a timeout.

```ts
executeRequest(request: Request, config?: Config): AxiosPromise<any>
```

### buildAndExecuteRequest

Builds and executes a request in a single call as a convenience function.

```ts
buildAndExecuteRequest(options: Options, config?: Config): AxiosPromise<any>
```

### extractResponse

Fetches a single value from an arbitrarily complex object or array using `parameters.path`. This uses lodash [get](https://lodash.com/docs/4.17.15#get) under the hood, which works by accessing values by keys or indices separated by `.` values. e.g. `a.3` would fetch the value of the 4th element in the `a` key of an object.

If a path is not provided, the initial value is returned as is.

```ts
extractResponse(data: unknown, parameters: ResponseParameters): any
```

### castResponse

**NB: See below for conversion behaviour**

Attempts to cast an input value based on the `type` parameter in the `parameters` object. An error is thrown if the value cannot be converted.

The following options are available for `type`:

1. `bool` -> boolean
2. `int256` -> number
3. `bytes32` -> string

```ts
castResponse(value: unknown, parameters: ResponseParameters): any
```

### extractAndCastResponse

Extracts and casts an arbitrary input in a single call as a convenience function.

```ts
extractAndCastResponse(data: unknown, parameters: ResponseParameters): any
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
  return adapter.extractResponse(v, { type: 'bool' });
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

const values = SPECIAL_INT_VALUES.map(v => {
  return adapter.extractResponse(v, { type: 'int256' });
});

console.log(values)
// [0, 0, 1, 1];
```

Number strings (and numbers) will attempt to be converted to numbers. The value will also be multiplied by the `times` value if it is present.

```ts
const VALID_INT_VALUES = [
  '123.456',
  7777,
];

const values = VALID_INT_VALUES.map(v => {
  return adapter.extractResponse(v, { type: 'int256', times: '1000' });
});

console.log(values)
// [123456, 7777000];
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

const values = VALID_INT_VALUES.map(v => {
  return adapter.extractResponse(v, { type: 'bytes32' });
});

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

const parameters = {
  path: 'prices.1',
  times: '100',
  type: 'int256',
};
const value = adapter.extractResponse(data, parameters);

console.log(value);
// 75051
```
