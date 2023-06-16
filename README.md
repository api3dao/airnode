<p align="center">
  <img
    src="https://user-images.githubusercontent.com/19530665/93134568-9bc9f580-f6e1-11ea-9a21-d9f5bed74fc7.png"
    width="720"
  />
</p>

Airnode is a fully-serverless oracle node that is designed specifically for API providers to operate their own oracles.

## Documentation

You can find an overview of Airnode in the [documentation](https://docs.api3.org/explore/airnode/what-is-airnode.html).

## For developers

This is a monorepo managed by [Lerna](https://github.com/lerna/lerna).

### Structure

[**airnode-abi**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-abi) Encoding and decoding utilities
for Airnode according to the
[Airnode ABI specifications](https://docs.api3.org/reference/airnode/latest/specifications/airnode-abi.html)

[**airnode-adapter**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-adapter) Used for building
requests from an [Oracle Integration Specification (OIS)](https://docs.api3.org/reference/ois/latest/), executing them,
parsing the responses, but also converting and encoding them for on chain purposes

[**airnode-admin**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-admin) A package/CLI tool to
interact with the Airnode contracts across chains

[**airnode-deployer**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer) A package/CLI tool to
automate Airnode deployment

[**airnode-examples**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples) A public list of
examples showcasing the features of Airnode

[**airnode-node**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-node) The node part of Airnode that
allows for connecting multiple blockchains to the rest of the world

[**airnode-operation**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-operation) Development and
testing utilities for the core parts of Airnode

[**airnode-protocol**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-protocol) The contracts that
implement the Airnode protocols

[**airnode-utilities**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-utilities) Provides common
utilities that are used by multiple Airnode packages

[**airnode-validator**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-validator) A package/CLI tool
that can be used to validate and convert airnode specification files

### Instructions

To install dependencies, run this at the repository root:

```sh
yarn run bootstrap
```

To build all the packages, run this at the repository root:

```sh
yarn run build
```

Airnode packages are cross platform, available as npm packages or docker containers. You should also be able to clone,
build and use the packages on any platform. However we do not guarantee that the development only features (e.g. test or
examples) will work out of the box.

We heavily recommend using UNIX based systems for development. If you are using Windows, consider
[WSL](https://docs.microsoft.com/en-us/windows/wsl/install).

We use [TS project references](https://www.typescriptlang.org/docs/handbook/project-references.html) to see
cross-package errors in real time. However, we use `ts-node` to run our development scripts and it
[does not support project references](https://github.com/TypeStrong/ts-node/issues/897) at the moment. This means that
some of the errors are only shown in the IDE or at build time, not when run using `ts-node`.

### Changelog

We use [changesets](https://github.com/atlassian/changesets) to manage the changelog for us. What that means for
contributors is that you need to add a changeset by running `yarn changeset` which contains what packages should be
bumped, their associated semver bump types and some markdown which will be inserted into changelogs.

A changeset is required to merge a PR if it changes one of the monorepo packages. If you really do not want to include a
changeset, you have to generate an empty one by running `yarn changeset:empty`. Note that a changeset is not required
for renovate PRs.

> Tip: Add `export EDITOR="code --wait"` to `.bashrc` to make it possible to write changelog description in VS Code (you
> can adapt the configuration for other editor similarly).

### Contributing

To request/propose new features, fixes, etc. create an issue. If you wish to contribute to the project, contact us over
[our Telegram](https://t.me/API3DAO).
