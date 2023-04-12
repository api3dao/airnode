# `@api3/airnode-admin`

> A package/CLI tool to interact with the Airnode contracts across chains

## Documentation

You can find documentation on how to use the admin CLI package in the
[admin CLI docs](https://docs.api3.org/reference/airnode/latest/packages/admin-cli.html).

## For developers

### Build the docker image locally

To build the image follow these [instructions](./docker/README.md).

### Run from source

There are two ways how to run the CLI from source without building a docker image:

- Run `yarn cli ...`
- First build the package using `yarn build`, then make the CLI binary executable by running
  `chmod +x ./dist/bin/admin.js`. Finally, you can run `yarn airnode-admin ...`.
