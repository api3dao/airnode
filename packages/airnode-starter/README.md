# Airnode examples

> A public list of examples showcasing the features of Airnode

The project will contain many runnable scripts to guide you through the necessary steps. You are recommended to read the
contents of the scripts as you run them.

Airnode is very flexible and can be used in various ways. For example, you may:
- Run Airnode as a docker container locally while connected to Rinkeby network
- Run Airnode as docker container locally, but connect to hardhat (local) network
- Deploy Airnode on AWS and connect to Rinkeby

These examples allow you to choose any of the methods above. We have decided to support Rinkeby for simplicity, but you
may adapt the configuration to work for your target chain.

## Request-Response protocol (RRP)

Currently, all of the examples facilitate the RRP protocol. The examples consist of two high level parts:
1. Deploy an `AirnodeRrp` contract and a `RrpRequester` on a supported chain
2. Deploy Airnode on a cloud provider (or run locally in a docker) and make a request using the deployed requester

_If you would like to know more about RRP, read this [API3 docs section](https://docs.api3.org/airnode/next/concepts/)._

## Setup

Follow the [repository instructions](https://github.com/api3dao/airnode#instructions).
Also, make sure you have `yarn` installed.
If you want to run Airnode in as docker container, you'll also need to have `docker` installed.

## Instructions

The following instructions will guide you step by step with RRP flow. Please note, that some steps may be skipped
depending on how you want to run the example - e.g. you don't need to start hardhat network locally when you intend to
run the example on Rinkeby.

### 1. Choose an example

First, you need to choose what example you want to run. We call these examples "integrations" because they are
integrated to some API. You will also need to choose how you want to run the Airnode and which network to use. If you intend to run an integration on Rinkeby, you will also need a funded account to deploy necessary contracts and trigger an Airnode request.

Run the following script and provide this information:
```sh
yarn choose-integration
```

### 2. (Only if using local blockchain) Start hardhat network

Run:
```sh
yarn eth-node
```

which will spin up a [hardhat network](https://hardhat.org/hardhat-network/) on your machine.

### 3. Deploy the RRP contract

The RRP is a contract that through with the [requester](link) triggers a request for Airnode. This contract is common for all Airnodes and requesters on a chain.

API3 team will deploy this contract for the most popular chains at some point, but for now you have to deploy it yourself using:

```sh
yarn deploy-rrp
```

### 4. (Only if deploying to AWS) Create AWS secrets file

If you intend to deploy Airnode on AWS, you will need to specify the credentials which will be used by the [airnode
deployer](link). If you are not sure where to find these or how to create an AWS account, follow [this
video](https://www.youtube.com/watch?v=KngM5bfpttA).

After you know the secrets, run the following script to specify them.

```sh
yarn create-aws-secrets
```

The command will generate an `aws.env` file with the entered secrets. This file be used only by the deployer and will
never leave your machine.

### 5. Create Airnode secrets

Airnode is configured by two files - `config.json` and `secrets.env`. Run the script below to create the `secrets.env` file with the necessary values.

```sh
yarn create-airnode-secrets
```

_Refer to the [documentation](https://docs.api3.org/airnode/next/grp-providers/guides/build-an-airnode/configuring-airnode.html) for more details_

### 6. Build docker artifacts

Our docker images are based on a common container which we call "artifacts". This intermediate container is then used by
both [deployer](https://github.com/api3dao/airnode/tree/master/packages/deployer) and
[airnode](https://github.com/api3dao/airnode/tree/master/packages/node). You can build the artifacts container by running:

```sh
yarn rebuild-artifacts-container
```

### 7. (Only if deploying to AWS) Build deployer container

```sh
yarn rebuild-deployer-container
```

This command will facilitate the previously built artifacts container to build the deployer.

### 8. (Only if deploying to AWS) Deploy Airnode

Now you're ready to deploy Airnode on AWS. Just run:

```sh
yarn deploy-airnode
```

This command will just use the [airnode deployer](https://github.com/api3dao/airnode/tree/master/packages/deployer) package. Deployment may take some time so be patient.

### 9. (Only if running Airnode locally) Build Airnode docker container

```sh
yarn rebuild-airnode-container
```

This command will facilitate the previously built artifacts container to build the containerized version of Airnode
which you can run locally.

### 10. (Only if running Airnode locally) Run the Airnode container

```sh
yarn run-airnode-locally
```

Runs the previously built version of Airnode container in a detached mode (in the backround).

### 11. Deploy a requester

At this point, you have a RRP contract deployed. You also either have a docker running locally or deployed on AWS.
Airnode is now listening on the events (requests to be made) of the RRP contract. All that is left now, is making a
request to it. 

The first step is to deploy a [requester](link) contract. Via this contract we will trigger an Airnode request using one
of our scripts. Run:

```sh
yarn deploy-requester
```

### 12. Derive and fund the sponsor wallet

Airnode requests requires a [sponsor](link), which will pay for the response transaction made by Airnode. Each sponsor
has a dedicated wallet for a given Airnode. This wallet is called a "sponsor wallet" and can be derived from sponsor
address and Airnode extended public key with the [admin CLI package](link). Refer to the
[documentation](https://docs.api3.org/airnode/next/grp-developers/requesters-sponsors.html#how-to-derive-a-sponsor-wallet)
for more details.

Run:
```sh
yarn derive-and-fund-sponsor-wallet
```

This script will first derive the sponsor wallet and afterwards fund it with "0.3" ETH. This means, that
your account (derived from the mnemonic by `choose-integration` script) must have enough funds.

### 13. Allow the sponsor to pay for requests made by requester

In order to prevent misuse, each sponsor has to explicitely approve a requester. Once the requester is approved, his
requests can be paid by this sponsor. 

```sh
yarn sponsor-requester
```

### 14. Make the request

Finally, the last step is to make an trigger Airnode request using the requester.

```sh
yarn make-request
```

When there is an blockchain event received by Airnode, it will immediately perform the API call and submit the response
back on chain. This command will wait for all of this to happen and you should see the final output in the CLI.
