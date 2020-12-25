<p align="center">
  <img src="https://user-images.githubusercontent.com/19530665/93134568-9bc9f580-f6e1-11ea-9a21-d9f5bed74fc7.png" width="720" />
</p>

Airnode is a fully-serverless oracle node that is designed specifically for API providers to operate their own oracles.
See the [docs](https://github.com/api3dao/api3-docs) for more information.

**Deployment instructions will be provided soon!**

## Structure

This is a monorepo managed using [Lerna](https://github.com/lerna/lerna).
It houses the following packages:

[**adapter**:](https://github.com/api3dao/airnode/tree/master/packages/adapter) The module that makes an API call, processes the response and returns a single value

[**airnode-abi**:](https://github.com/api3dao/airnode/tree/master/packages/airnode-abi) Encoding and decoding utilities for Airnode according to the [Airnode ABI specifications](https://github.com/api3dao/api3-docs/blob/master/airnode/airnode-abi-specifications.md)

[**deployer**:](https://github.com/api3dao/airnode/tree/master/packages/deployer) Tools to automate Airnode deployment

[**node**:](https://github.com/api3dao/airnode/tree/master/packages/node) Airnode itself

[**ois**:](https://github.com/api3dao/airnode/tree/master/packages/ois) Types for [Oracle Integration Specification (OIS)](https://github.com/api3dao/api3-docs/blob/master/airnode/ois.md)

[**protocol**:](https://github.com/api3dao/airnode/tree/master/packages/protocol) Contracts that implement the Airnode protocol (the request-response version)

[**validator**:](https://github.com/api3dao/airnode/tree/master/packages/validator) A package that can be used to validate [OIS](https://github.com/api3dao/api3-docs/blob/master/airnode/ois.md), [config.json](https://github.com/api3dao/api3-docs/blob/master/airnode/config-json.md) and [security.json](https://github.com/api3dao/api3-docs/blob/master/airnode/security-json.md) files

## Instructions

To install dependencies, run this at the repository root:

```sh
yarn run bootstrap
```

## Contributing

To request/propose new features, fixes, etc. create an issue.
If you wish to contribute to the project, contact us over [our Telegram](https://t.me/API3DAO).
