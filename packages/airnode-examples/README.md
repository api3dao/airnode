# Airnode examples

> A public list of examples showcasing the features of Airnode

The project will contain many runnable scripts to guide you through the necessary steps. You are recommended to read the
contents of the scripts as you run them.

Airnode is very flexible and can be used in various ways. For example, you may:

- Run Airnode as a docker container locally while connected to Rinkeby network
- Run Airnode as a docker container locally, but connected to the hardhat (local) network
- Deploy Airnode on AWS or GCP and use the Rinkeby network

You can run these examples with any of the combination above. We have decided to support Rinkeby just for simplicity,
but you may adapt the configuration to work for your target chain.

## Request-Response protocol (RRP)

Currently, all of the examples utilize the RRP protocol. The example RRP flow consists of two high level parts:

1. Deploy an `AirnodeRrp` contract and a `RrpRequester` contract on a supported chain
2. Deploy Airnode on a cloud provider, or run locally in a docker container, and make a request using the deployed
   requester

If you would like to know more about RRP, read the [API3 docs](https://docs.api3.org/airnode/v0.3/concepts/).

## Available examples

We call examples "integrations" because they are integrated with some API. With each integration you are offered a
choice of how you want to run the Airnode and which network to use, as mentioned above. The integrations have been
designed to highlight various Airnode functionality and use cases, from simple price requests to more complex
authenticated requests encoding multiple reserved parameters. The following list orders integrations alphabetically:

- [CoinGecko](https://github.com/api3dao/airnode/blob/master/packages/airnode-examples/integrations/coingecko) -
  unauthenticated cryptocurrency price request
- [CoinGecko Testable](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/coingecko-testable) -
  same price request as the CoinGecko example above. However, the endpoint is allowed to be tested using the
  [HTTP gateway](https://docs.api3.org/airnode/v0.4/grp-providers/guides/build-an-airnode/http-gateway.html).
- [CoinMarketCap](https://github.com/api3dao/airnode/blob/master/packages/airnode-examples/integrations/authenticated-coinmarketcap) -
  authenticated cryptocurrency price request
- [OpenWeather](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/weather-multi-value) -
  authenticated weather request encoding multiple parameters including the transaction timestamp, time of sunset,
  temperature, and a description of the weather.
- [Relay security schemes](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/relay-security-schemes) -
  demonstration of how to relay multiple request metadata like chain ID and sponsor address to the API endpoint.

## Setup

Follow the [repository instructions](https://github.com/api3dao/airnode#instructions). Also, make sure you have `yarn`
installed. If you want to run Airnode as a docker container, you'll also need to have `docker` installed.

## Instructions

The following instructions will guide you step by step with the RRP flow. Please note, that some steps may be skipped
depending on how you want to run the example - e.g. you don't need to start a hardhat network locally when you intend to
run the example with Rinkeby.

### 1. Choose an example

The first step is to choose an integration and network.

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

The [RRP contract](https://docs.api3.org/airnode/v0.3/concepts/#airnoderrp-sol) is a contract through which the
[requester](https://docs.api3.org/airnode/latest/concepts/requester.html) triggers a request for Airnode. This contract
is common for all Airnodes and requesters on a chain.

API3 team will deploy this contract for the most popular chains at some point, but for now you have to deploy it
yourself using:

```sh
yarn deploy-rrp
```

### 5. (Only if deploying to AWS) Create AWS secrets file

If you intend to deploy Airnode on AWS, you will need to specify the credentials which will be used by the
[deployer](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer). If you are not sure where to find
these or how to create an AWS account, see
[the following docs section](https://docs.api3.org/airnode/v0.3/grp-providers/docker/deployer-image.html#aws).

After you know the secrets, run the following script to specify them:

```sh
yarn create-aws-secrets
```

### 6. (Only if deploying to GCP) Create GCP credentials

If you intend to deploy Airnode on GCP, you will need to create a service account for your project and add and download
an access key for this account. If you are not sure how to do this or how to create a GCP account, see
[the following docs section](https://docs.api3.org/airnode/v0.3/grp-providers/docker/deployer-image.html#gcp).

Store the access key file as `gcp.json` into the integration directory - e.g. if you have chosen the `coingecko`
integration, store the file as `integrations/coingecko/gcp.json`.

### 7. Create Airnode configuration

Airnode is configured by two files - `config.json` and `secrets.env`. The configuration is different based on where the
Airnode is deployed, because every cloud provider has different settings. These differences are minor and we take care
of it for you by generating the `config.json` once you specify where you want to deploy the Airnode.

To generate the `config.json`, run:

```sh
yarn create-airnode-config
```

### 8. Create Airnode secrets

Airnode is configured by two files - `config.json` and `secrets.env`. The `config.json` was already created in previous
step. The latter, `secrets.env` can be generated it using:

```sh
yarn create-airnode-secrets
```

> If you are using docker for Windows/WSL or docker for mac and you want to connect to your local hardhat network, you
> will need to modify the generated `secrets.env` file found in `integrations/<integration-name>/` by replacing the
> provider URL with the following: `PROVIDER_URL=http://host.docker.internal:8545`. This is a docker limitation. See:
> https://stackoverflow.com/a/24326540.
>
> The `create-airnode-secrets` script will handle this for you.

Refer to the
[documentation](https://docs.api3.org/airnode/latest/grp-providers/guides/build-an-airnode/configuring-airnode.html) for
more details.

### 9. Build docker artifacts

Our docker images are based on a common container which we call "artifacts". This intermediate container is then used by
both [deployer](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer) and
[airnode](https://github.com/api3dao/airnode/tree/master/packages/airnode-node). You can build the artifacts container
by running:

```sh
yarn rebuild-artifacts-container
```

### 10. (Only if deploying to a cloud provider) Build deployer container

```sh
yarn rebuild-deployer-container
```

This command will facilitate the previously built artifacts container to build the deployer.

### 11. (Only if deploying to a cloud provider) Deploy Airnode

Now you're ready to deploy Airnode on the cloud provider. Just run:

```sh
yarn deploy-airnode
```

This command will use the [deployer](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer) package
to deploy your Airnode. Deployment may take some time so be patient.

### 12. (Only if running Airnode locally) Build Airnode docker container

```sh
yarn rebuild-airnode-container
```

This command will facilitate the previously built artifacts container to build the containerized version of Airnode
which you can run locally.

### 13. (Only if running Airnode locally) Run the Airnode container

```sh
yarn run-airnode-locally
```

Runs the previously built version of Airnode container. Note that the containerized version runs a cron job which
triggers every minute - this means that Airnode logs won't start appearing immediately.

### 14. Deploy a requester

At this point, you have a RRP contract deployed. You also either have a docker running locally or deployed on a cloud
provider. Airnode is now listening on the events (requests to be made) of the RRP contract. All that is left now, is
making a request to it.

The first step is to deploy a requester contract. Run:

```sh
yarn deploy-requester
```

### 15. Derive and fund the sponsor wallet

Airnode request requires a [sponsor](https://docs.api3.org/airnode/latest/concepts/sponsor.html), which will pay for the
response transaction made by Airnode. Each sponsor has a dedicated wallet for a given Airnode. This wallet is called a
"sponsor wallet" and can be derived from sponsor address and Airnode's extended public key with the
[admin CLI package](https://github.com/api3dao/airnode/tree/master/packages/airnode-admin). Refer to the
[documentation](https://docs.api3.org/airnode/v0.3/grp-developers/requesters-sponsors.html#how-to-derive-a-sponsor-wallet)
for more details.

Run:

```sh
yarn derive-and-fund-sponsor-wallet
```

This script will first derive the sponsor wallet and afterwards fund it with 0.1 ETH. This means, that your account
(derived from the mnemonic by `choose-integration` script) must have enough funds.

### 16. Allow the sponsor to pay for requests made by the requester

In order to prevent misuse, each sponsor has to explicitly approve a requester. Once the requester is approved, requests
can be paid by this sponsor.

```sh
yarn sponsor-requester
```

### 17. Make the request

Finally, the last step is to trigger an Airnode request using the requester.

```sh
yarn make-request
```

When there is an blockchain event received by Airnode, it will immediately perform the API call and submit the response
back on chain. This command will wait for all of this to happen and you should see the final output in the CLI.

### 18. (Optional) Make a withdrawal request

Withdrawal requests instruct the Airnode return the funds of particular sponsor wallet back to sponsor. This step is
recommended when testing on public testnets. To do so run:

```sh
yarn make-withdrawal-request
```

### 19. (Only if deploying to a cloud provider) Remove Airnode from the cloud provider

If you want to tear down the Airnode from the cloud provider run:

```sh
yarn remove-airnode
```

This will use the deployer to remove the Airnode lambdas from the cloud provider.

## For developers

When pulling or creating a new integration you need to run `yarn build` to create necessary contract artifacts.

The main point of these examples is to demonstrate the flexibility and features of Airnode, while being easy to
maintain. The main design choice is that all integrations share the same instructions. This has several trade offs,
notably:

1. Some instructions may be skipped depending on the setup.
2. Number of instructions will grow (but not much) in the future.
3. Common instruction set is very convenient to test and maintain.
4. Integration configuration files need to be generated dynamically and integrations and this requires abstraction.
5. Reading the script sources is difficult.
6. It's very easy for the developer to add a new integration.
7. Integration specific stuff should be explained in the `README.md` of the particular integration. It is fine if this
   contains additional manual instructions.
8. The `config.example.env` and `secrets.example.env` are used for reference when browsing code on github and to ensure
   they are up to date using the validator package.

### End to end testing

The examples package is also a nice fit for an end to end test of the whole Airnode infrastructure. There are two tests:

1. An integration using Airnode docker on localhost - This test also builds the necessary docker images and runs on as
   part of end to end test suite on CI.
2. An integration using the Airnode deployed on AWS with Rinkeby network - This is intended to be run by a developer
   before making a release. This test is located in the `scripts` directory, because it should not be run on CI because
   if its performance and complexity.

   Be sure to define the necessary secrets before running this test.
