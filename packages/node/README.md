# @api3/node

> The node part of Airnode that allows for connecting multiple blockchains to the rest of the world

## Features

- Earn money by exposing your API to the rapidly growing blockchain dApp market
- Listen for on-chain events and respond with off-chain data
- Requesters pay all transaction costs
- Simple installation and limited to no day-to-day maintenance
- Serverless allows for paying as you use and limitless scalability

## Installation

**Important: Airnode is in active development and likely to change before the stable release**

Airnode has not yet been published, so you will need to clone and install the entire repository. This can be done by running:

```sh
git clone git@github.com:api3dao/airnode.git

# Install and link dependencies (run from the monorepo root)
yarn run bootstrap

# Build each @api3 package (run from the monorepo root)
yarn run build
```

## Configuration

Before running Airnode, you will need to have a valid `config.json` and `security.json` placed in the packages/node folder. You can find more information on these files in the API3 documentation [repository](https://github.com/api3dao/api3-docs).

## Usage

You must have a valid `config.json` file present in the `__dev__` folder. It is also recommended to use a `.env` file for handling secrets. See [Development](#Development) below for more details.

### Invoking

Airnode does not yet have an stable API for usage. However, you can run Airnode locally, for development and test environments, by running the following command:

```sh
# Run Airnode once using the AWS serverless handler
yarn run dev:invoke
```

### Testing API

You can test the endpoints specified in your `config.json` by running the following command:

```sh
# --endpoint-id Endpoint ID
# --parameters Parameters as JSON
yarn run dev:testApi --endpoint-id "0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353" --parameters '{"from": "EUR"}'
```

## Behaviour

This is a running list of how different errors are handled by the node and test tracking. It is likely to change in the future.

https://docs.google.com/spreadsheets/d/1DanVn7WyP96D5max2_5T5enJz7TcCsRceoqDfDfCcnA/edit?usp=sharing

## Directory Structure

```sh
src/
├── adapters/            # Modules allowing Airnode access to the outside world
│   └── http/            # The HTTP adapter
├── config/              # Global Airnode configuration
├── coordinator/         # The "main" function that oversees execution and state
│   └── calls/           # Aggregating, executing and disaggregating API calls
├── evm/                 # EVM specific code
│   ├── authorization/   # Authorizing requesters and requests
│   ├── contracts/       # Contract addresses and ABIs
│   ├── fulfillments/    # Fulfilling EVM requests
│   ├── handlers/        # EVM specific "pipeline" implementations
│   ├── requests/        # Request/response specific code
│   ├── templates        # Fetching and applying request templates
│   └── verification/    # Request verification
├── handlers/            # "Pipeline" type modules that generally serve as entry points
├── providers/           # Provider workers and state
├── requests/            # Generic modules applicable to different blockchains
├── utils/               # General utility functions
└── workers/             # Utility function that allow for "forking"
    └── cloud-platforms/ # Implementations for specific cloud vendors
```

## Development

### config.json

Before you can use or invoke Airnode locally, you must have a valid `config.json` in the `__dev__` folder. You can find the [config.json](https://github.com/api3dao/api3-docs/blob/master/airnode/config-json.md) specifications with the [API3 documentation](https://github.com/api3dao/api3-docs).

For your convenience, example `config.json` and `.env` files are provided in the `__dev__` folder. You can simply copy these files and remove the `.example` extension.

### Blockchain node

In order to invoke Airnode, you will need to provide the HTTP URL to an existing blockchain node. For your convenience, the following blockchain nodes can be started in development mode using:

```sh
###########################################
# Ethereum
###########################################
# Start a node at http://127.0.0.1:8545 (separate terminal)
yarn run dev:eth-node

# Deploy the Airnode protocol contracts
yarn run dev:eth-deploy

# Create onchain requests that can be processed when invoking Airnode
yarn run dev:eth-requests
```

For more information, please refer to the [operation README](https://github.com/api3dao/airnode/blob/master/packages/operation/README.md)

### Dummy web API

A "dummy" web API is also included with the operation package. This exposes a simple [Express.js](https://github.com/expressjs/express) server with a few hardcoded endpoints.

This API can be started by running:

```sh
# Start the API at http://localhost:5000 (separate terminal)
yarn run dev:api
```

For more information, please refer to the [operation README](https://github.com/api3dao/airnode/blob/master/packages/operation/README.md)

### Dependencies

If an update has been made to another sibling dependency package, you must remember to build these changes by running `yarn run build` from the monorepo root.

## Testing

Like with a development setup, it is important to ensure that all sibling dependencies are built before running tests. Use `yarn run build` from the monorepo root to build all of these packages.

Tests can run using the following commands:

```sh
# From the monorepo root
yarn run test:node

# Watches all changes to node files and re-runs tests when one is changed
yarn run test:node:watch

# Watches all changes to a specific node file and re-runs tests when it is changed
yarn run test:node:watch -f src/evm/handlers/initialize-provider.test.ts

# From the node package
yarn run test
yarn run test:watch
yarn run test:watch -f evm/handlers/initialize-provider.test.ts
```

### E2E tests

End-to-end (E2E) tests test the entire Airnode request–response protocol, from start to finish. This includes (but is not limited to): deploying Airnode RRP, creating the relevant onchain data, making onchain requests, invoking Airnode and testing relevant expected outcomes.

In order to run E2E tests, you will need to have both an Ethereum node and the "dummy" web API running. The simplest way to accomplish this is by running:

```sh
# Start an Ethereum node and mock API
yarn run dev:eth-node
yarn run dev:api

# OR

# Start both an Ethereum node and the "dummy" web API as background processes
yarn run dev:background
```

E2E tests are run in parallel and can be run using the following commands:

```sh
# Run all E2E tests in parallel
yarn run test:e2e

# Run a specific E2E test and include Airnode log output. Change the test in package.json
yarn run test:e2e:debug
```

For more information, please refer to the [operation README](https://github.com/api3dao/airnode/blob/master/packages/operation/README.md)

E2E tests are defined in the `test/e2e/` folder and are identified by the `feature.ts` extension.
