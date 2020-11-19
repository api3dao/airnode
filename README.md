<p align="center">
  <img src="https://user-images.githubusercontent.com/19530665/93134568-9bc9f580-f6e1-11ea-9a21-d9f5bed74fc7.png" width="720" />
</p>

Airnode is a fully-serverless oracle node that is designed specifically for API providers to operate their own oracles.
See the [docs](https://github.com/api3dao/api3-docs) for more information.

**Deployment instructions will be provided soon!**

## Structure

This is a monorepo managed using [Lerna](https://github.com/lerna/lerna).
It houses the following packages:

[**adapter**:](/packages/adapter/README.md) The module that makes an API call, processes the response and returns a single value

[**deployer (not merged yet)**:](https://github.com/api3dao/airnode/tree/aws-deployment/packages/deployer) Tools to automate Airnode deployment

[**node**:](/packages/node/README.md) Airnode itself

[**ois**:](/packages/ois) Types for [Oracle Integration Specification (OIS)](https://github.com/api3dao/api3-docs/blob/master/airnode/2-6-ois.md)

[**protocol**:](/packages/protocol/README.md) Contracts that implement the Airnode protocol (the request-response version)

[**validator**:](/packages/validator) A package that can be used to validate [OIS](https://github.com/api3dao/api3-docs/blob/master/airnode/2-6-ois.md), [config.json](https://github.com/api3dao/api3-docs/blob/master/airnode/2-7-config-json.md) and [security.json](https://github.com/api3dao/api3-docs/blob/master/airnode/2-8-security-json.md) files

## Instructions

To install dependencies, run this at the repository root:
```sh
yarn run bootstrap
```

## Contributing

To request/propose new features, fixes, etc. create an issue.
If you wish to contribute to the project, contact us over [our Telegram](https://t.me/API3DAO).
