# @airnode/operation

> Development and testing utilities for Airnode

## Setup

This package is currently not intended to be used in a standalone way. Instead you can clone and setup the full monorepo by running the following commands:

```sh
# Install and link dependencies
yarn run bootstrap

# Build each @airnode package
yarn run build

# Compile Solidity contracts
yarn run dev:eth-compile
```

## Airnode Development

See below for more details

### tl;dr

```sh
# Start Eth node
yarn run dev:eth-node

# Deploy Airnode with API providers, templates, requesters etc (separate terminal)
yarn run dev:eth-deploy

# Copy the output client and template addresses into the config/evm-dev-config.json file

# Make requests for Airnode to action (separate terminal)
yarn run dev:eth-requests

# Airnode can then be invoked to process the requests
yarn run dev:invoke
```

### Ethereum Development Node

Start an Ethereum development node by running:

```sh
yarn run dev:eth-node
```

By default, this node listens on `http://127.0.0.1:8545/`. This is important as you will need to use this value in your `config.json` when running the Airnode node.

This development node uses [Hardhat](https://hardhat.org/) behind the scenes. It creates no contracts by itself and only pre-funds a (configurable) number of accounts/addresses.

### Deploying Airnode

After starting an Ethereum development node, you can deploy the Airnode contracts to it by running:

```sh
yarn run dev:eth-deploy
```

Along with simply deploying the Airnode contracts, the above command will also create API providers onchain, deploy client contracts, create request templates and authorizers and several other things. See [Configuration](#Configuration) below for more information on customizing this behaviour.

It is important to note that the Ethereum development node uses the same master mnemonic which means that the contracts will be deployed to the same addresses after restarting the node.

### Making Requests

Now that the contracts have been deployed and initial data setup, you can create some requests by running:

```sh
yarn run dev:eth-requests
```

Invoking Airnode will cause these requests to be actioned.

## Configuration

### Configuring deployment

Deployment can be configured by adjusting the `config/eth-dev-config.json` file. This file has the following top level structure:

```json
{
  "addresses": { ... },
  "apiProviders": { ... },
  "authorizers": { ... },
  "clients": { ... },
  "requesters": [],
  "requests": []
}
```

### 1. Addresses

Before you can make requests to the deployed Airnode contracts, you need to provide the addresses to use. This is because the "make requests" script has no context of what was previously deployed.

All relevant values are output by the "deploy Airnode" script.

The following fields are required:

`addresses.clients.[name]` - the string address value of each client contract that was deployed.

`addresses.templates.[api-provider].[template-name]` - the string address value of each template that was deployed. Templates are grouped by API provider as they can have duplicate names between API providers.

### 2. apiProviders

`apiProviders` must have a unique name as the key.

`mnemonic` - must be a unique 12 or 24 list of dictionary words. You can generate a mnemonic [here](https://iancoleman.io/bip39/). **DO NOT SEND REAL FUNDS TO A WALLET LINKED TO A TEST MNEMONIC**

**Endpoints**

`endpoints` - a key/value object where the key is the unique endpoint name and the value is an object describing the endpoint details. Casing matters here as the endpoint is encoded and hashed to generate the `endpointId`.

`endpoints.[name].authorizers` - a list of `authorizer` contracts. The values must correspond to a value defined in the `authorizers` top-level field.

**Templates**

`templates` - a key/value object where the key is the unique template name and the value is the template object.

`template.[name].endpoint` - a unique name given to the endpoint. Casing is important here

`fulfillClient` - the name of the fulfilling client contract. The contract must be defined in the `clients` top-level field

`fulfillFunctionName` - the function to call when a request is fulfilled

`requester` - the name of the requester who will have permissions to use the template. Must be defined in the `requesters` field.

`parameters` - a list of parameters that be encoded directly using [airnode-abi](https://github.com/api3dao/airnode/tree/master/packages/airnode-abi)

### 3. authorizers

`authorizers` is a key/value object where the key represents the unique authorizer name and the value is either an existing address or a string name of an existing authorizer contract. Values beginning with `0x` will not be deployed, while all other values will require a contract of the same name. See the [Authorizer documentation](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/authorizer.md) for more details.

### 4. clients

`clients` - a key/value object where the key represents the unique client contract name and the value represents the client options. All names defined correspond with actual contracts in the `contracts/folder`. See the [client documentation](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/client.md) for more details.

`client.[name].endorsers` - a list of requesters who have endorsed the client. See the [endorsement documentation](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/endorsement.md) for more details.

### 5. requesters

Requesters represent an ordered list of entities making requests to a given API provider. Typically these would be individuals or businesses. You can find more information in the [Requester documentation](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/requester.md).

It is important to note that requesters is an array as they are assigned accounts in order. This is necessary as requesters need to use the same wallet when running each script.

Each requester object has the following structure:

`id` - a unique string that can be used to identify the same requester between script runs

`apiProviders.[name].ethBalance` - a string value that represents how much ETH should be deposited into the requester's designated wallet for the given API provider. Requesters have one designated wallet per API provider.

### 6. requests

There are currently three types of requests that can be made. You can learn more about these request types in the [request documentation](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/request.md)

**Shared Fields**

`requesterId` - the ID for the requester making

`type` - "short", "regular" or "full"

`apiProvider` - the name of the API provider

`client` - the name of the client contract

**Short Requests**

`template` - the name of the template

`parameters` - parameters that can be encoded directly using [airnode-abi](https://github.com/api3dao/airnode/tree/master/packages/airnode-abi)

**Regular Requests**

`template` - the name of the template

`fulfillFunctionName` - the name of the function to call when a fulfill transaction is submitted. Typically this would be `fulfill` or similar.

`parameters` - parameters that can be encoded directly using [airnode-abi](https://github.com/api3dao/airnode/tree/master/packages/airnode-abi)

**Full Requests**

`endpoint` - the name of the endpoint for the specific API provider

`fulfillFunctionName` - the name of the function to call when a fulfill transaction is submitted. Typically this would be `fulfill` or similar.

`parameters` - parameters that can be encoded directly using [airnode-abi](https://github.com/api3dao/airnode/tree/master/packages/airnode-abi)

#### Full Example

```json
{
  "addresses": {
    "clients": {
      "MockAirnodeClient": "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0"
    },
    "templates": {
      "CurrencyConverterAPI": {
        "template-1": "0x747f464d39cbe9884854ba2b6cf58ad7b94a6e520826faf74c3c4b2d3b34276d"
      }
    }
  },
  "apiProviders": {
    "CurrencyConverterAPI": {
      "mnemonic": "bracket simple lock network census onion spy real spread pig hawk lonely",
      "endpoints": {
        "convertToUSD": {
          "authorizers": ["public"]
        }
      },
      "templates": {
        "template-1": {
          "endpoint": "convertToUSD",
          "fulfillClient": "MockAirnodeClient",
          "fulfillFunctionName": "fulfill",
          "requester": "bob",
          "parameters": [
            { "type": "bytes32", "name": "to", "value": "USD" },
            { "type": "bytes32", "name": "_type", "value": "uint256" },
            { "type": "bytes32", "name": "_path", "value": "result" },
            { "type": "bytes32", "name": "_times", "value": "100000" }
          ]
        }
      }
    }
  },
  "authorizers": {
    "public": "0x0000000000000000000000000000000000000000"
  },
  "clients": {
    "MockAirnodeClient": { "endorsers": ["bob"] }
  },
  "requesters": [
    {
      "id": "alice",
      "apiProviders": {
        "CurrencyConverterAPI": { "ethBalance": "1" }
      }
    },
    {
      "id": "bob",
      "apiProviders": {
        "CurrencyConverterAPI": { "ethBalance": "5" }
      }
    }
  ],
  "requests": [
    {
      "requesterId": "bob",
      "type": "short",
      "apiProvider": "CurrencyConverterAPI",
      "template": "template-1",
      "client": "MockAirnodeClient",
      "parameters": []
    },
    {
      "requesterId": "bob",
      "type": "regular",
      "apiProvider": "CurrencyConverterAPI",
      "template": "template-1",
      "client": "MockAirnodeClient",
      "fulfillFunctionName": "fulfill",
      "parameters": []
    },
    {
      "requesterId": "bob",
      "type": "full",
      "apiProvider": "CurrencyConverterAPI",
      "endpoint": "convertToUSD",
      "client": "MockAirnodeClient",
      "fulfillFunctionName": "fulfill",
      "parameters": [
        { "type": "bytes32", "name": "to", "value": "USD" },
        { "type": "bytes32", "name": "_type", "value": "uint256" },
        { "type": "bytes32", "name": "_path", "value": "result" },
        { "type": "bytes32", "name": "_times", "value": "100000" }
      ]
    }
  ]
}
```
