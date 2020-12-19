# @airnode/operation

> Development and testing utilities for Airnode

## Setup

This package is currently not intended to be used in a standalone way. Instead you can clone and setup the full monorepo by running the following commands:

```sh
# Install and link dependencies
yarn bootstrap

# Build each @airnode package
yarn build

# Compile Solidity contracts
yarn compile
```

## Airnode Development

See below for more details

### tl;dr

```sh
# Start Eth node
yarn dev:eth-node

# Deploy Airnode with API providers, templates, requesters etc (separate terminal)
yarn dev:eth-deploy

# Make requests for Airnode to action (separate terminal)
yarn dev:eth-requests
```

### Ethereum Development Node

Start an Ethereum development node by running:

```sh
yarn dev:eth-node
```

By default, this node listens on `http://127.0.0.1:8545/`. This is important as you will need to use this value in your `config.json` when running the Airnode node.

This development node uses [Hardhat](https://hardhat.org/) behind the scenes. It creates no contracts by itself and only pre-funds a (configurable) number of accounts/addresses.

### Deploying Airnode

After starting an Ethereum development node, you can deploy the Airnode contracts to it by running:

```sh
yarn dev:eth-deploy
```

Along with simply deploying the Airnode contracts, the above command will also create API providers onchain, deploy client contracts, create request templates and authorizers and several other things. See [Configuration](#Configuration) below for more information on customizing this behaviour.

It is important to note that the Ethereum development node uses the same master mnemonic which means that the contracts will be deployed to the same addresses after restarting the node.

### Making Requests

Now that the contracts have been deployed and initial data setup, you can create some requests by running:

```sh
yarn dev:eth-requests
```

Invoking Airnode will cause these requests to be actioned.

## Configuration

### Configuring deployment

Deployment can be configured by adjusting the `config/eth-dev-deploy.json` file. This file has the following top level structure:

- apiProviders
- authorizers
- clients

```json
{
  "apiProviders": { ... },
  "authorizers": { ... },
  "clients: { ... }
}
```

#### 1. apiProviders

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

`requester` - the name of the requester who will have permissions to use the template. Must be defined in the `requesters` field in `evm-dev-requesters.json`.

`parameters` - a list of parameters that be encoded directly using [airnode-abi](https://github.com/api3dao/airnode/tree/master/packages/airnode-abi)

#### 2. authorizers

`authorizers` is a key/value object where the key represents the unique authorizer name and the value is either an existing address or a string name of an existing authorizer contract. Values beginning with `0x` will not be deployed, while all other values will require a contract of the same name. See the [Authorizer documentation](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/authorizer.md) for more details.

#### 3. clients

`clients` - a key/value object where the key represents the unique client contract name and the value represents the client options. All names defined correspond with actual contracts in the `contracts/folder`. See the [client documentation](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/client.md) for more details.

`client.[name].endorsers` - a list of requesters who have endorsed the client. See the [endorsement documentation](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/endorsement.md) for more details.

#### Example

```json
{
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
    "public": "0x0000000000000000000000000000000000000000",
    "anotherauthorizer": "MyCustomAuthorizer"
  },
  "clients": {
    "MockAirnodeClient": { "endorsers": ["bob"] }
  }
}
```

### Configuring Requesters

Requesters can be configured by adjusting the `config/eth-dev-requesters.json` file. This file has the following top level structure:

- requesters

```json
{
  "requesters": [...],
}
```

It is important to note that requesters is an array as they are assigned accounts in order. This is necessary as requesters need to have the same wallet when running multiple scripts.

#### 1. requesters

Each requester object has the following structure:

```json
{
  "id": "alice",
  "apiProviders": {
    "CurrencyConverterAPI": {
      "ethBalance": "5"
    }
  }
}
```

`id` must be unique value.

`apiProviders.[name]` - must correspond to an API defined in the `eth-dev-deploy.json` file

`apiProvders.[name].ethBalance` - represents how much ETH to deposit to the specific requester's designated wallet for the given API provider.

#### Example

```json
{
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
  ]
}
```

### Configuring Requests

Airnode requests can be configured by editing the `config/evm-dev-requests.json`. This file has the following top-level structure:

```json
{
  "clients": { ... },
  "requests": [...]
}
```

Note that requests is a list as requests are made in order.

#### Clients

Before you can create requests, you need to ensure that all required client implementations have been deployed. Client are created as part of the deployment process. After deploying the Airnode contracts, you will need to copy the client address(es) that are output and paste them into `config/evm-dev-requests.json` with the correct name/value pairs.

By default a contract called `MockAirnodeClient` is included as part of the deployment script.

**Example**

```json
{
  "clients": {
    "MockAirnodeClient": "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0"
  },
  "requests": []
}
```

#### Requests

There are 3 types of requests that can be made. You can learn more about these request types in the [request documentation](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/request.md)


**Short requests**

Short requests have the following structure

```json

{
  "requesterId": "bob",
  "type": "short",
  "client": "MockAirnodeClient",
  "templateId": "0x747f464d39cbe9884854ba2b6cf58ad7b94a6e520826faf74c3c4b2d3b34276d",
  "parameters": []
}
```

**Regular Requests**

Regular requests have the following structure

```json
```
