# @airnode/node

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

# Build each @airnode package (run from the monorepo root)
yarn run build
```

## Configuration

Before running Airnode, you will need to have a valid `config.json` and `security.json` placed in the packages/node folder. You can find more information on these files in the API3 documentation [repository](https://github.com/api3dao/api3-docs).

## Usage

### Invoking

Airnode does not yet have an stable API for usage. However, you can run Airnode locally, for development and test environments, by running the following command:

```sh
# Run Airnode once using the AWS serverless handler
yarn run dev:invoke
```

You must have a valid `config.json` file present in the `__dev__` folder. It is also recommended to use a `.env` file for handling secrets. See [Development](#Development) below for more details.

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
│   ├── authorization/   # Authorizing clients and requests
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

Before you can use or invoke Airnode locally, you must have a valid `config.json` in the `__dev__` folder. You can find the [config.json](https://github.com/api3dao/api3-docs/blob/master/airnode/config-json.md) specifications with the [API3 documentation](https://github.com/api3dao/api3-docs).

For your convenience, example `config.json` and `.env` files are provided in the `__dev__` folder. You can simply copy these files and remove the `.example` extension.

If an update has been made to another sibling dependency package, you must remember to build these changes by running `yarn run build` from the monorepo root.

## Testing

Like with a development setup, it is important to ensure that all sibling dependencies are built before running tests. Use `yarn run build` from the monorepo root to build all of these packages.

Tests can run using the following commands:

```sh
# From the monorepo root
yarn run test:node

# Watches all changes to node files and re-runs tests when one is changed
yarn run test:node:watch

# From the node package
yarn run test
yarn run test:watch
```
