# `@api3/airnode-node`

> The node part of Airnode that allows for connecting multiple blockchains to the rest of the world

## Documentation

You can learn all the information about Airnode in the [docs](https://docs.api3.org/reference/airnode/latest/).

## For developers

### Build the docker image locally

To build the image follow these [instructions](./docker/README.md).

### Configuration

Before running Airnode, you will need to have a valid `config.json` and `security.json` placed in the
packages/airnode-node folder. You can find more information on these files in the API3 documentation
[repository](https://github.com/api3dao/api3-docs).

### Usage

You must have a valid `config.json` file present in the `__dev__` folder. It is also recommended to use a `.env` file
for handling secrets. See [Development](#Development) below for more details.

### Invoking

Airnode does not yet have an stable API for usage. However, you can run Airnode locally, for development and test
environments, by running the following command:

```sh
# Run Airnode once using the AWS serverless handler
yarn run dev:invoke
```

### Testing API

You can test the endpoints specified in your `config.json` by running the following command:

```sh
# --endpoint-id Endpoint ID
# --parameters Parameters as JSON
yarn run dev:http-data-invoke --endpoint-id "0xd9e8c9bcc8960df5f954c0817757d2f7f9601bd638ea2f94e890ae5481681153" --parameters '{"coinId": "bitcoin"}'
```

### Directory Structure

```sh
src/
├── adapters/            # Modules allowing Airnode access to the outside world
│   └── http/            # The HTTP adapter
├── api/                 # Contains the handler which calls the API provider, performs request processing
├── cli/                 # Contains basic CLI which to invoke the Airnode locally during development and tests
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
├── reporting/           # Heartbeat implementation
├── requests/            # Generic modules applicable to different blockchains
├── utils/               # General utility functions
└── workers/             # Utility function that allow for "forking"
    └── cloud-platforms/ # Implementations for specific cloud vendors
```

### Local invocation

Before you can use or invoke Airnode locally, you must have a valid `config.json` in the `config` folder. You can find
the specification in the
[config.json documentation](https://docs.api3.org/reference/airnode/latest/deployment-files/config-json.html).

For your convenience, example `config.json` and `secrets.env` files are provided in the `config` folder. You can simply
copy these files and remove the `.example` from the filename.

### Unit tests

Like with a development setup, it is important to ensure that all sibling dependencies are built before running tests.
Use `yarn run build` from the monorepo root to build all of these packages.

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

End-to-end (E2E) tests test the entire Airnode request–response protocol, from start to finish. This includes (but is
not limited to): deploying Airnode RRP, creating the relevant onchain data, making onchain requests, invoking Airnode
and testing relevant expected outcomes.

In order to run E2E tests, you will need to have both an Ethereum node and the "dummy" web API running. The simplest way
to accomplish this is by running following commands from the repo root:

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

E2E tests are defined in the `test/e2e/` folder and are identified by the `feature.ts` extension.
