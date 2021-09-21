# Airnode starter

> A starter project for deploying an Airnode and making requests to it

The project will contain many runnable scripts to guide you through the necessary steps. You are recommended to read the
contents of the scripts as you run them, and read the entire README before starting.

## Setup

After cloning this repo, run:
```bash
yarn
```

## Request-Response protocol

<!-- TODO: link rrp protocol: https://docs.api3.org/next/concepts/ -->

This starter project is composed of two sections:
1. Deploy an `AirnodeRrp` contract on a supported chain
2. Deploy Airnode on a cloud provider and make a request to it

### 1. Deploy Airnode contract

The `AirnodeRrp.sol` is a common contract for all Airnodes and requesters for a given chain.
<!-- TODO: Link: https://docs.api3.org/next/concepts/#contracts -->

<!-- TODO: Maybe just deploy specifically to rinkeby -->
We have already deployed the `AirnodeRrp` on the few most popular EVM chains. If you see your targeted chain in
`deployments` folder - you can safely skip this step.

<!-- TODO: document what to do when running locally (you need to run the ETH node as well) -->
In case you want to deploy the contract yourself, you need to do the following:
1. Copy `hardhat-credentials.example.json` to `hardhat-credentials.json`
2. Fill the details for chain you want to deploy on
3. Run one of the deploy scripts listed in `package.json` - for example `yarn deploy:rinkeby`

<!-- TODO: Rest of the instructions -->
