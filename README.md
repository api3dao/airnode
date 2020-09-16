<p align="center">
  <img src="https://user-images.githubusercontent.com/19530665/93134568-9bc9f580-f6e1-11ea-9a21-d9f5bed74fc7.png" width="400" />
</p>

Airnode is a fully-serverless oracle node that is designed specifically for API providers to operate their own oracles
See [the docs](https://github.com/api3dao/api3-docs) for more information.

## Structure

This is a monorepo managed using [Lerna](https://github.com/lerna/lerna).
At the moment, it houses two packages:

**protocol**: EVM contracts used to interact with Airnode

**node**: Airnode itself

## Instructions

To install dependencies:
```
npm run bootstrap
```