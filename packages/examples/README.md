# Airnode examples

> A public list of examples showcasing the features of Airnode

The project will contain many runnable scripts to guide you through the necessary steps. You are recommended to read the
contents of the scripts as you run them.

Airnode is very flexible and can be used in various ways. For example, you may:
- Run Airnode as a docker container locally while connected to Rinkeby network
- Run Airnode as a docker container locally, but connected to the hardhat (local) network
- Deploy Airnode on AWS and use the Rinkeby network

You can run these examples with any of the combination above. We have decided to support Rinkeby just for simplicity,
but you may adapt the configuration to work for your target chain.

## Request-Response protocol (RRP)

Currently, all of the examples facilitate the RRP protocol. The example RRP flow consists of two high level parts:
1. Deploy an `AirnodeRrp` contract and a `RrpRequester` on a supported chain
2. Deploy Airnode on a cloud provider (or run locally in a docker) and make a request using the deployed requester

If you would like to know more about RRP, read the [API3 docs](https://docs.api3.org/airnode/next/concepts/).

## Setup

Follow the [repository instructions](https://github.com/api3dao/airnode#instructions). Also, make sure you have `yarn`
installed. If you want to run Airnode as a docker container, you'll also need to have `docker` installed.

## Instructions

The following instructions will guide you step by step with the RRP flow. Please note, that some steps may be skipped
depending on how you want to run the example - e.g. you don't need to start a hardhat network locally when you intend to
run the example with Rinkeby.

### 1. Choose an example

First, you need to choose what example you want to run. We call these examples "integrations" because they are
integrated with some API. You will also need to choose how you want to run the Airnode and which network to use.

If you intend to run an integration on Rinkeby, you will also need a funded account to deploy necessary contracts and
trigger an Airnode request. For hardhat network you can use the account derived by hardhat default mnemonic which is
already funded.

Run the following script to interactively choose your integration:
```sh
yarn choose-integration
```

After you have chosen an integration, be sure to read out its README for details. You will find it in
`integrations/<integration-name>/README.md`.

### 2. (Only if using local blockchain) Start hardhat network

Run:
```sh
yarn eth-node
```

which will spin up a [hardhat network](https://hardhat.org/hardhat-network/) on your machine.

### 3. (Optional) Print out the user account information

Run:

```sh
yarn print-account-details
```

This script will show you the address of the account derived from the specified mnemonic. This account will be used to
deploy the contracts and make transactions, so make sure it is funded. The recommended amount is at least 0.3 ETH.

### 4. Deploy the RRP contract

The [RRP contract](https://docs.api3.org/airnode/next/concepts/#airnoderrp-sol) is a contract through which the
[requester](https://docs.api3.org/airnode/next/concepts/requester.html) triggers a request for Airnode. This contract is
common for all Airnodes and requesters on a chain.

API3 team will deploy this contract for the most popular chains at some point, but for now you have to deploy it
yourself using:

```sh
yarn deploy-rrp
```

### 5. (Only if deploying to AWS) Create AWS secrets file

If you intend to deploy Airnode on AWS, you will need to specify the credentials which will be used by the
[deployer](https://github.com/api3dao/airnode/tree/master/packages/deployer). If you are not sure where to find these or
how to create an AWS account, follow [this video](https://www.youtube.com/watch?v=KngM5bfpttA).

After you know the secrets, run the following script to specify them:

```sh
yarn create-aws-secrets
```

The command will generate an `aws.env` file with the entered secrets. This file is used only by the deployer and will
never leave your machine.

### 6. Create Airnode secrets

Airnode is configured by two files - `config.json` and `secrets.env`. The `config.json` is already created in the
integration. The latter, `secrets.env` must be created. You can generate it using:

```sh
yarn create-airnode-secrets
```

> If you are not using docker for linux and you want to connect to your local hardhat network, you will need to modify the generated
> `secrets.env` file found in `integrations/<integration-name>/` by replacing the provider URL with the following: `PROVIDER_URL=http://host.docker.internal:8545`. This is
> a docker limitaton. See: https://stackoverflow.com/a/24326540

Refer to the
[documentation](https://docs.api3.org/airnode/next/grp-providers/guides/build-an-airnode/configuring-airnode.html) for
more details.

### 7. Build docker artifacts

Our docker images are based on a common container which we call "artifacts". This intermediate container is then used by
both [deployer](https://github.com/api3dao/airnode/tree/master/packages/deployer) and
[airnode](https://github.com/api3dao/airnode/tree/master/packages/node). You can build the artifacts container by
running:

```sh
yarn rebuild-artifacts-container
```

### 8. (Only if deploying to AWS) Build deployer container

```sh
yarn rebuild-deployer-container
```

This command will facilitate the previously built artifacts container to build the deployer.

### 9. (Only if deploying to AWS) Deploy Airnode

Now you're ready to deploy Airnode on AWS. Just run:

```sh
yarn deploy-airnode
```

This command will use the [deployer](https://github.com/api3dao/airnode/tree/master/packages/deployer) package to deploy
your Airnode. Deployment may take some time so be patient.

### 10. (Only if running Airnode locally) Build Airnode docker container

```sh
yarn rebuild-airnode-container
```

This command will facilitate the previously built artifacts container to build the containerized version of Airnode
which you can run locally.

### 11. (Only if running Airnode locally) Run the Airnode container

```sh
yarn run-airnode-locally
```

Runs the previously built version of Airnode container. Note that the containerized version runs a cron job which
triggers every minute - this means that Airnode logs won't start appearing immediately.

### 12. Deploy a requester

At this point, you have a RRP contract deployed. You also either have a docker running locally or deployed on AWS.
Airnode is now listening on the events (requests to be made) of the RRP contract. All that is left now, is making a
request to it. 

The first step is to deploy a requester contract. Run:

```sh
yarn deploy-requester
```

### 13. Derive and fund the sponsor wallet

Airnode request requires a [sponsor](https://docs.api3.org/airnode/next/concepts/sponsor.html), which will pay for the
response transaction made by Airnode. Each sponsor has a dedicated wallet for a given Airnode. This wallet is called a
"sponsor wallet" and can be derived from sponsor address and Airnode's extended public key with the [admin CLI
package](https://github.com/api3dao/airnode/tree/master/packages/admin). Refer to the
[documentation](https://docs.api3.org/airnode/next/grp-developers/requesters-sponsors.html#how-to-derive-a-sponsor-wallet)
for more details.

Run:
```sh
yarn derive-and-fund-sponsor-wallet
```

This script will first derive the sponsor wallet and afterwards fund it with 0.1 ETH. This means, that your account
(derived from the mnemonic by `choose-integration` script) must have enough funds.

### 14. Allow the sponsor to pay for requests made by the requester

In order to prevent misuse, each sponsor has to explicitely approve a requester. Once the requester is approved, his
requests can be paid by this sponsor. 

```sh
yarn sponsor-requester
```

### 15. Make the request

Finally, the last step is to trigger an Airnode request using the requester.

```sh
yarn make-request
```

When there is an blockchain event received by Airnode, it will immediately perform the API call and submit the response
back on chain. This command will wait for all of this to happen and you should see the final output in the CLI.

### 16. (Only if deploying to AWS) Remove Airnode from AWS

If you want to tear down the Airnode from AWS run:

```sh
yarn remove-airnode
```

This will use the deployer to remove the Airnode lambdas from AWS.
