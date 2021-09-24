# Airnode starter

> A starter project for deploying an Airnode and making requests to it

The project will contain many runnable scripts to guide you through the necessary steps. You are recommended to read the
contents of the scripts as you run them, and read the entire README before starting.

## Setup

You only need to follow the [repository instructions](https://github.com/api3dao/airnode#instructions)

## Request-Response protocol

<!-- TODO: link rrp protocol: https://docs.api3.org/next/concepts/ -->

This starter project is composed of two sections:
1. Deploy an `AirnodeRrp` contract and a `RrpRequester` on a supported chain
2. Deploy Airnode on a cloud provider (or run locally in a docker) and make a request using the deployed requester

<!-- ### 1. Deploy Airnode contract -->

<!-- The `AirnodeRrp.sol` is a common contract for all Airnodes and requesters for a given chain. -->
<!-- TODO: Link: https://docs.api3.org/next/concepts/#contracts -->

<!-- TODO: Document what to do when running locally (you need to run the ETH node as well) -->

<!-- TODO: Rest of the instructions -->

### High level instructions

1. `yarn choose-integration` - choose `aws` and `rinkeby` _(other combinations are WIP)_
2. `yarn deploy-rrp`
3. `yarn create-airnode-secrets`
4. `yarn create-aws-secrets`
5. `yarn deploy-airnode` _(For some reason, I have to manually add execution rights to deployer using `chmod +x
   packages/deployer/dist/bin/deployer.js`, but Michal couldn't reproduce it yet)_
6. `yarn deploy-requester`
7. `yarn derive-and-fund-sponsor-wallet`
8. `yarn sponsor-requester`
9. `yarn make-request`
