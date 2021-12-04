# @api3/airnode-plug

> Process and transform arbitrary JSON structures

## Features

- Lightweight with minimal dependencies

- Composable

- Synchronous and does not require spawning additional Serverless workers

- Secure. VM or sandbox not required

- Expandable by adding more custom plugs

- Works for both requesters & API providers

- Can be used in a "web playground" where users can experiment with pipelines before production use.

## Description

airnode-plug provides utilities from transforming JSON structures using "plugs". Plugs are inspired by [Elixir's Plug module](https://hexdocs.pm/plug/readme.html) where each plug receives a connection and must return a connection. The same applies applies with airnode-plug. A plug receives a JSON object and must return a JSON object.

By keeping the signature the same for all plugs, we can arbitrarily combine and compose plugs to transform JSON in all sorts of different ways.

Airnode plugs have 3 keys:

**NOTE: THIS API CAN EASILY BE CHANGED**

`name` - the name of the plug

`inputs` - a list of inputs to provide when calling the plug. Each plug currently has a specific number of inputs, although plugs could be created that process any number of inputs. e.g. a "mean" plug that calculates the average of 10+ different fields

`output` - the key to output the result to. This can be used to overwrite existing fields. Not required for some plugs. e.g. "remove"

## Pipelines

As mentioned above, plugs can be composed. A more concrete example of this:

```ts
const pipeline: Plug[] = [
  { name: 'add', inputs: ['a', 'b'], output: 'c' },
  { name: 'add', inputs: ['c', 5], output: 'd' },
];

const input = { a: 1, b: 2 };

const output = AirnodePlug.process(input, pipeline);

// Output: { a: 1, b: 2, c: 3, d: 8 };
```

## Dynamic keys

Airnode plug supports "dynamic" object keys. This allows the user to access an unknown key at an arbitrary depth. Dynamic keys use the following syntax: `${path.to.value}`

Example:

```ts
const input = {
  currencies: ['ETH'],
  ETH: {
    price: 123
  }
}

const dynamicPath = '${currencies.0}.price';
// Output path: 'ETH.price'
// Output value: 123
```

## Current Plugs

| Name            | Input Arity |
| -----------     | ----------- |
| add             | 2           |
| cast-boolean    | 1           |
| concat          | 2           |
| format-date     | 3           |
| put             | 1           |
| redact          | 1           |
| remove          | 1           |
| substring       | 3           |
