# `@api3/airnode-validator`

The validator is used by the Docker Images to validate the configuration files you provide when deploying an Airnode.
You can also use the validator to check the configuration files for correct formatting and other issues while creating
them.

## Usage

<!-- TODO: Link to validator docs when available -->

Validator is currently an internal dependency of Airnode and not intended to be used in a standalone way.

## Build Manually

You can clone and build the Airnode monorepo then run the validator as a yarn script from inside the
`packages/airnode-validator` directory.

<!-- TODO: fix commands for v2 validator cli -->

```sh
# execute the validator
yarn run cli:validator --specs="exampleSpecs/config.json"

# validator output
{
  "success": true,
  "data": {...} # Config file contents
}
```