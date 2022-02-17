<p align="center">
  <img
    src="https://user-images.githubusercontent.com/19530665/93134568-9bc9f580-f6e1-11ea-9a21-d9f5bed74fc7.png"
    width="720"
  />
</p>

Airnode is a fully-serverless oracle node that is designed specifically for API providers to operate their own oracles.
See the [docs](https://github.com/api3dao/api3-docs) for deployment and usage instructions.

## Structure

This is a monorepo managed using [Lerna](https://github.com/lerna/lerna). It houses the following packages:

[**adapter**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-adapter) The module that makes an API
call, processes the response and returns a single value

[**admin**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-admin) A package/CLI tool to interact with
the Airnode contracts across chains

[**airnode-abi**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-abi) Encoding and decoding utilities
for Airnode according to the
[Airnode ABI specifications](https://docs.api3.org/airnode/latest/reference/specifications/airnode-abi-specifications.html)

[**deployer**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer) Tools to automate Airnode
deployment

[**examples**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples) A public list of examples
showcasing the features of Airnode

[**node**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-node) Airnode itself

[**ois**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-ois) Types for
[Oracle Integration Specification (OIS)](https://docs.api3.org/ois/v1.0.0/)

[**operation**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-operation) Development and testing
utilities for the core parts of Airnode

[**protocol**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-protocol) Contracts that implement
Airnode RRP (request–response protocol)

[**validator**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-validator) A package that can be used
to validate and convert airnode specification files

## Instructions

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

## Changelog

We use [changesets](https://github.com/atlassian/changesets) to manage the changelog for us. What that means for
contributors is that you need to add a changeset by running `yarn changeset` which contains what packages should be
bumped, their associated semver bump types and some markdown which will be inserted into changelogs.

A changeset is required to merge a PR if it changes one of the monorepo packages. If you really do not want to include a
changeset, you have to generate an empty one by running `yarn changeset:empty`. Note that a changeset is not required
for dependabot PRs.

> Tip: Add `export EDITOR="code --wait"` to `.bashrc` to make it possible to write changelog description in VS Code (you
> can adapt the configuration for other editor similarly).

## Contributing

To request/propose new features, fixes, etc. create an issue. If you wish to contribute to the project, contact us over
[our Telegram](https://t.me/API3DAO).
