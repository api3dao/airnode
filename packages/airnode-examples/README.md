# Airnode examples

> A public list of examples showcasing the features of Airnode

This project contains runnable scripts that will guide you through the necessary steps to run an Airnode instance. You
are encouraged to read through the contents of the scripts before you run them.

Airnode is flexible and can be used in a variety of ways on multiple Ethereum Virtual Machine (EVM) compatible chains.

The examples support running Airnode locally as a Docker container and on cloud services, specifically AWS Lambda and
GCP Cloud Functions.

The Airnode Examples support a subset of common EVM chains which will be presented when you run
`yarn choose-integration`. Optionally you may also adapt the configuration to support your target chain.

## Request-Response protocol (RRP)

Currently, all of the examples utilize the RRP protocol. The example RRP flow consists of two high level parts:

1. Deploy an `AirnodeRrp` contract and a `RrpRequester` contract on a supported chain
2. Deploy Airnode on a cloud provider, or run locally in a docker container, and make a request using the deployed
   requester

If you would like to know more about RRP, read the [API3 docs](https://docs.api3.org/airnode/latest/concepts/).

## Available examples

The examples are called "integrations" because they are integrations with a public API. Each integration offers a
different scenario for running an Airnode instance. The integrations have been designed to highlight various Airnode
functionality and use cases, from simple price requests to more complex authenticated requests encoding multiple
reserved parameters. The following list orders integrations alphabetically:

- [CoinGecko](https://github.com/api3dao/airnode/blob/master/packages/airnode-examples/integrations/coingecko) -
  unauthenticated cryptocurrency price request
- [CoinGecko Testable](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/coingecko-testable) -
  same price request as the CoinGecko example above. However, the endpoint is allowed to be tested using the
  [HTTP gateway](https://docs.api3.org/airnode/latest/grp-providers/guides/build-an-airnode/http-gateway.html).
- [CoinMarketCap](https://github.com/api3dao/airnode/blob/master/packages/airnode-examples/integrations/authenticated-coinmarketcap) -
  authenticated cryptocurrency price request
- [OpenWeather](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/weather-multi-value) -
  authenticated weather request encoding multiple parameters including the transaction timestamp, time of sunset,
  temperature, and a description of the weather.
- [Relay security schemes](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/relay-security-schemes) -
  demonstration of how to relay multiple request metadata like chain ID and sponsor address to the API endpoint.
- [CoinGecko signed data](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/coingecko-signed-data) -
  same price request as the CoinGecko example above. However, the endpoint can be used to retrieve signed data for
  beacon updates.

## Setup

Follow the [repository instructions](https://github.com/api3dao/airnode#instructions). Also, make sure you have `yarn`
installed. If you want to run Airnode as a docker container, you'll also need to have `docker` installed.

## Instructions

The following instructions will guide you step by step through the RRP flow. Please note, that some steps may be skipped
depending on how you would like to run the example - e.g. you don't need to start a hardhat network locally when you
intend to run the example with a public network.

### 1. Choose an example

The first step is to choose an integration and network.

If you intend to run an integration on a public network, you will also need a funded account to deploy the necessary
contracts and trigger an Airnode request. For a hardhat network you can use the account derived by hardhat's default
mnemonic which is already funded.

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

The [RRP contract](https://docs.api3.org/airnode/latest/concepts/#airnoderrp-sol) is a contract through which the
[requester](https://docs.api3.org/airnode/latest/concepts/requester.html) triggers a request for Airnode. This contract
is common for all Airnodes and requesters on a chain.

The API3 team will deploy this contract for the most popular chains at some point, but for now you have to deploy it
yourself using:

```sh
yarn deploy-rrp
```

### 5. (Only if deploying to AWS) Create AWS secrets file

If you intend to deploy Airnode on AWS, you will need to specify the credentials which will be used by the
[deployer](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer). If you are not sure where to find
these or how to create an AWS account, see
[the following docs section](https://docs.api3.org/airnode/latest/grp-providers/docker/deployer-image.html#aws).

After you know the secrets, run the following script to specify them:

```sh
yarn create-aws-secrets
```

### 6. (Only if deploying to GCP) Create GCP credentials

If you intend to deploy Airnode on GCP, you will need to create a service account for your project and create and
download an access key for the new account. If you are not sure how to do this or how to create a GCP account, see
[the following docs section](https://docs.api3.org/airnode/latest/grp-providers/docker/deployer-image.html#gcp).

Store the access key file as `gcp.json` in the integration directory - e.g. if you have chosen the `coingecko`
integration, store the file as `integrations/coingecko/gcp.json`.

### 7. Create Airnode configuration

Airnode is configured by two files - `config.json` and `secrets.env`. The configuration changes based on where the
Airnode is deployed due to differing cloud provider requirements and settings. These differences are minor but for your
convenience the configuration in these examples is generated automatically.

To generate the `config.json`, run:

```sh
yarn create-airnode-config
```

### 8. Create Airnode secrets

Airnode is configured by two files - `config.json` and `secrets.env`. The `config.json` was created in previous step.
The latter, `secrets.env` can be generated by running:

```sh
yarn create-airnode-secrets
```

> If you are using docker for Windows/WSL or docker for Mac and you want to connect to your local hardhat network, you
> will need to modify the generated `secrets.env` file found in `integrations/<integration-name>/` by replacing the
> provider URL with the following: `PROVIDER_URL=http://host.docker.internal:8545`. This is a docker limitation. See:
> https://stackoverflow.com/a/24326540.
>
> The `create-airnode-secrets` script will handle this for you.

Refer to the
[documentation](https://docs.api3.org/airnode/latest/grp-providers/guides/build-an-airnode/configuring-airnode.html) for
more details.

### 9. A Note on Docker Images

API3 makes docker container builds for releases available on [Docker Hub](https://hub.docker.com/u/api3/). API3 also
makes development builds available; if this repository represents a clone of the clean state of a recent commit it is
likely that an image will be available for it on Docker Hub. In this scenario you will not need to rebuild any
containers and can skip container build steps, specifically steps 10, 11, and 13.

Development images will be automatically selected by the `run-airnode-locally` and `deploy-airnode` commands.

### 10. Rebuild Artifacts Image

The docker images are based on a common container called "artifacts". This intermediate container is used by both
[deployer](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer) and
[airnode](https://github.com/api3dao/airnode/tree/master/packages/airnode-node).

If you wish to rebuild the artifacts container, you can do so by running the following command:

```sh
yarn rebuild-artifacts-container
```

### 11. (Only if deploying to a cloud provider) Build deployer container

The following command will use the previously built artifacts container to build the deployer:

```sh
yarn rebuild-deployer-container
```

### 12. (Only if deploying to a cloud provider) Deploy Airnode

Now you're ready to deploy Airnode on the cloud provider. To proceed, run:

```sh
yarn deploy-airnode
```

This command will use the [deployer](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer) package
to deploy your Airnode. Deployment may take some time and should not be interrupted. Please be patient.

### 13. (Only if running Airnode locally) Build Airnode docker container

```sh
yarn rebuild-airnode-container
```

This command will utilise the previously built artifacts container to build the containerized version of Airnode which
you can then run locally.

### 14. (Only if running Airnode locally) Run the Airnode container

This command runs Airnode locally. If the local git state is clean and a prebuilt image is available on Docker Hub, this
command will pull the necessary images from Docker Hub.

If it fails to pull the image, please build the necessary images (refer to steps 10 and 13).

Note that the containerized version of Airnode runs as a cron job which is triggered every minute - this means that
Airnode logs won't start appearing immediately.

```sh
yarn run-airnode-locally
```

### 15. Deploy a requester

At this point, you have an RRP contract deployed. You will also either have Airnode running as a Docker container  
locally or deployed to a cloud provider. Airnode is now listening for events (requests to be made) from the RRP
contract. Requests via the RRP contract originate from requester contracts and therefore a requester contract will need
to be deployed in order to make an on-chain request to your Airnode instance.

To deploy a requester contract, run:

```sh
yarn deploy-requester
```

### 16. Derive and fund the sponsor wallet

Airnode requests require a [sponsor](https://docs.api3.org/airnode/latest/concepts/sponsor.html), which will pay for the
response transaction made by Airnode. Each sponsor has a dedicated wallet for a given Airnode. This wallet is called a
"sponsor wallet" and can be derived from a sponsor address and Airnode's extended public key with the
[admin CLI package](https://github.com/api3dao/airnode/tree/master/packages/airnode-admin). Refer to the
[documentation](https://docs.api3.org/airnode/latest/grp-developers/requesters-sponsors.html#how-to-derive-a-sponsor-wallet)
for more details.

To derive and fund the sponsor wallet, run:

```sh
yarn derive-and-fund-sponsor-wallet
```

This script will first derive the sponsor wallet and then fund it with 0.1 ETH. This means that your account (derived
from the mnemonic by `choose-integration` script) must have enough funds.

### 17. Allow the sponsor to pay for requests made by the requester

In order to prevent misuse, each sponsor has to explicitly approve a requester. Once the requester is approved, requests
can be paid by this sponsor.

```sh
yarn sponsor-requester
```

### 18. Make the request

The last step is to trigger an Airnode request using the requester contract:

```sh
yarn make-request
```

This command will create a transaction which calls a function on the requester contract. The requester contract will
emit an event in response, which Airnode will detect during its next cycle. On receipt of this request event, Airnode
will perform the associated API call and submit the response back on chain. The above command will wait for all of this
to take place and once the request has been fulfilled the output will be sent to the terminal.

### 19. (Optional) Make a withdrawal request

Withdrawal requests instruct the Airnode return the funds of particular sponsor wallet back to the sponsor. This step is
useful when testing on public testnets. To execute a withdrawal request run:

```sh
yarn make-withdrawal-request
```

### 20. (Only if deploying to a cloud provider) Remove Airnode from the cloud provider

If you wish to tear down the Airnode from the cloud provider run:

```sh
yarn remove-airnode
```

This will use the deployer to remove the Airnode functions from the cloud provider.

## For developers

When pulling or creating a new integration you need to run `yarn build` to create the necessary contract artifacts.

The main purpose of these examples is to demonstrate the flexibility and features of Airnode, whilst being easy to
maintain. The main design choice is that all integrations share the same instructions. This has several trade-offs,
notably:

1. Some instructions may be skipped depending on the setup.
2. Number of instructions will grow (but not by much) in the future.
3. Common instruction set is very convenient to test and maintain.
4. Integration configuration files need to be generated dynamically and this requires abstraction.
5. Reading the script sources is difficult.
6. It's very easy for the developer to add a new integration.
7. Integration-specific errata should be explained in the `README.md` of the particular integration. It is fine if this
   contains additional manual instructions.
8. The `config.example.env` and `secrets.example.env` are used for reference when browsing code on Github and to ensure
   they are up-to-date using the validator package.

### End to end testing

The examples package is a nice fit for an end-to-end test of the entire Airnode infrastructure. There are two tests:

1. An integration using Airnode docker on localhost - This test also builds the necessary docker images and runs as part
   of an end-to-end test suite on CI.
2. An integration using the Airnode deployed on AWS with the Rinkeby network - This is intended to be run by a developer
   before making a release. This test is located in the `scripts` directory. It should not be run on CI due to
   performance and complexity implications.

   Be sure to define the necessary secrets before running this test.
