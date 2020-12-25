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

# Run from the repository root
yarn run bootstrap
```

## Configuration

Before running Airnode, you will need to have a valid `config.json` and `security.json` placed in the packages/node folder. You can find more information on these files in the API3 documentation [repository](https://github.com/api3dao/api3-docs).

## Usage

Airnode does not yet have an stable API for usage. However, you can run for development and testing by running the following from the repository root:

```sh
# Run Airnode once using the AWS serverless handler
yarn run invoke:aws

# Expose a local endpoint at localhost:3000 where you can initiate actions by sending HTTP requests
yarn run dev:aws
```

## Behaviour

This is a running list of how different errors are handled by the node and test tracking. It is likely to change in the future.

https://docs.google.com/spreadsheets/d/1DanVn7WyP96D5max2_5T5enJz7TcCsRceoqDfDfCcnA/edit?usp=sharing

## Directory Structure

```sh
src/
├── adapters/           # Modules allowing Airnode access to the outside world
│   └── http/           # The HTTP adapter
├── config/             # Global Airnode configuration
├── coordinator/        # The "main" function that oversees execution and state
│   └── calls/          # Aggregating, executing and disaggregating API calls
├── evm/                # EVM specific code
│   ├── authorization/  # Authorizing clients and requests
│   ├── contracts/      # Contract addresses and ABIs
│   ├── fulfillments/   # Fulfilling EVM requests
│   ├── handlers/       # EVM specific "pipeline" implementations
│   ├── requests/       # Request/response specific code
│   ├── templates       # Fetching and applying request templates
│   ├── triggers/       # Trigger specific implementations
│   └── verification/   # Request verification
├── handlers/           # "Pipeline" type modules that generally serve as entry points
├── providers/          # Provider workers and state
├── requests/           # Generic modules applicable to different blockchains
├── utils/              # General utility functions
└── workers/            # Utility function that allow for "forking"

```
