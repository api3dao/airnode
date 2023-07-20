# `@api3/airnode-examples`

> A public list of examples showcasing the features of Airnode

This project contains runnable scripts that will guide you through the necessary steps to run an Airnode instance. You
are encouraged to read through the contents of the scripts before you run them.

Airnode is flexible and can be used in a variety of ways on multiple Ethereum Virtual Machine (EVM) compatible chains.

The examples support running Airnode locally as a Docker container and on cloud services, specifically AWS Lambda and
GCP Cloud Functions.

The Airnode Examples support a subset of common EVM chains which will be presented when you run
`yarn choose-integration`. Optionally you may also adapt the configuration to support your target chain.

## Documentation

### Request-Response protocol (RRP)

Currently, all of the examples utilize the RRP protocol. The example RRP flow consists of two high level parts:

1. Deploy an `AirnodeRrpV0` contract and a `RrpRequesterV0` contract on a supported chain
2. Deploy Airnode on a cloud provider, or run locally in a docker container, and make a request using the deployed
   requester

If you would like to know more about RRP, read the
[API3 docs](https://docs.api3.org/reference/airnode/latest/concepts/).

### Available examples

The examples are called "integrations" because they are integrations with a public API. Each integration offers a
different scenario for running an Airnode instance. The integrations have been designed to highlight various Airnode
functionality and use cases, from simple price requests to more complex authenticated requests encoding multiple
reserved parameters. The following list orders integrations alphabetically:

- [authenticated-coinmarketcap](https://github.com/api3dao/airnode/blob/master/packages/airnode-examples/integrations/authenticated-coinmarketcap) -
  authenticated cryptocurrency price request.
- [coingecko](https://github.com/api3dao/airnode/blob/master/packages/airnode-examples/integrations/coingecko) -
  unauthenticated cryptocurrency price request.
- [coingecko-cross-chain-authorizer](https://github.com/api3dao/airnode/blob/master/packages/airnode-examples/integrations/coingecko) -
  demonstration of a cross-chain [authorizer](https://docs.api3.org/reference/airnode/latest/concepts/authorizers.html).
- [coingecko-http-gateways](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/coingecko-http-gateways) -
  demonstration of the
  [HTTP gateway and HTTP signed data gateway](https://docs.api3.org/reference/airnode/latest/understand/http-gateways.html).
- [coingecko-post-processing](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/coingecko-post-processing) -
  demonstration of the [post-processing](https://docs.api3.org/reference/ois/latest/processing.html) feature.
- [coingecko-pre-processing](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/coingecko-pre-processing) -
  demonstration of the [pre-processing](https://docs.api3.org/reference/ois/latest/processing.html) feature.
- [coingecko-template](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/coingecko-template) -
  demonstration of [template](https://docs.api3.org/reference/airnode/latest/developers/using-templates.html) requests.
- [failing-example](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/failing-example) -
  demonstration of Airnode error handling through an invalid request.
- [relay-security-schemes](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/relay-security-schemes) -
  demonstration of how to relay multiple request metadata like chain ID and sponsor address to the API endpoint.
- [weather-multi-value](https://github.com/api3dao/airnode/tree/master/packages/airnode-examples/integrations/weather-multi-value) -
  authenticated weather request encoding multiple parameters including the transaction timestamp, time of sunset,
  temperature, and a description of the weather.

### Setup

First, download the repository source code at a specific tag or release, or, alternatively, clone the repository and
check out a specific git commit tag; the unreleased master branch is not supported and is for development purposes only.
Run the following to check out a tag, for example `v0.6`:

```sh
git fetch --tags && git checkout v0.6
```

Next, make sure you have `yarn` installed and then follow the
[repository instructions](https://github.com/api3dao/airnode#instructions) to install dependencies and build the
packages. If you want to run Airnode as a docker container, you'll also need to have `docker` installed.

### Instructions

The following instructions will guide you step by step through the RRP flow. Please note, that some steps may be skipped
depending on how you would like to run the example - e.g. you don't need to start a hardhat network locally when you
intend to run the example with a public network.

If using a Linux distribution that enforces SELinux policies, make sure allow the Docker images access to the host
directory by
[creating an appropriate rule](https://stackoverflow.com/questions/24288616/permission-denied-on-accessing-host-directory-in-docker).

#### 1. Choose an example

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

#### 2. (Only if using local blockchain) Start hardhat network

Run:

```sh
yarn eth-node
```

which will spin up a [hardhat network](https://hardhat.org/hardhat-network/) on your machine.

#### 3. (Optional) Print out the user account information

Run:

```sh
yarn print-account-details
```

This script will show you the address of the account derived from the specified mnemonic. This account will be used to
deploy the contracts and make transactions, so make sure it is funded. The recommended amount is at least 0.3 ETH.

#### 4. (Only if using local blockchain) Deploy the RRP contract

The [RRP contract](https://docs.api3.org/reference/airnode/latest/concepts/#airnoderrpv0-sol) is a contract through
which the [requester](https://docs.api3.org/reference/airnode/latest/concepts/requester.html) triggers a request for
Airnode. This contract is common for all Airnodes and requesters on a chain.

If you are using a local blockchain, deploy the contract using the first command below. Otherwise, the contract deployed
by API3 on the chosen chain will be used automatically. The second command, also optional if using a public blockchain,
deploys the contract necessary for gas estimation.

```sh
yarn deploy-rrp
yarn deploy-rrp-dry-run
```

#### 5. (Only if deploying to AWS) Create AWS secrets file

If you intend to deploy Airnode on AWS, you will need to specify the credentials which will be used by the
[deployer](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer). If you are not sure where to find
these or how to create an AWS account, see
[the following docs section](https://docs.api3.org/reference/airnode/latest/understand/configuring.html#aws-setup-aws-deployment-only).

After you know the secrets, run the following script to specify them:

```sh
yarn create-aws-secrets
```

The credentials should be stored in the integration directory - e.g. if you have chosen the `coingecko` integration,
store the file as `integrations/coingecko/aws.env`.

#### 6. (Only if deploying to GCP) Create GCP credentials

If you intend to deploy Airnode on GCP, you will need to create a service account for your project and create and
download an access key for the new account. If you haven't already done so, you will also need to enable billing for
your project by pairing it with your credit card. The amount of resources used by the Airnode examples should fit well
within the free tier, which means no charges will be incurred.

If you are not sure how to create a GCP service account, see or download the access key for it,
[the following docs section](https://docs.api3.org/reference/airnode/latest/understand/configuring.html#gcp-setup-gcp-deployment-only).

Store the access key file as `gcp.json` in the integration directory - e.g. if you have chosen the `coingecko`
integration, store the file as `integrations/coingecko/gcp.json`.

#### 7. Create Airnode configuration

Airnode is configured by two files - `config.json` and `secrets.env`. The configuration changes based on where the
Airnode is deployed due to differing cloud provider requirements and settings. These differences are minor but for your
convenience the configuration in these examples is generated automatically.

To generate the `config.json`, run:

```sh
yarn create-airnode-config
```

#### 8. Create Airnode secrets

Airnode is configured by two files - `config.json` and `secrets.env`. The `config.json` was created in previous step.
The latter, `secrets.env` can be generated by running:

```sh
yarn create-airnode-secrets
```

> If you are using Docker Desktop (on any platform) and you want to connect to your local hardhat network, you will need
> to modify the generated `secrets.env` file found in `integrations/<integration-name>/` by replacing the provider URL
> with the following: `PROVIDER_URL=http://host.docker.internal:8545`. This is a docker limitation. See:
> https://stackoverflow.com/a/24326540. A symptom of needing this change is the following error when attempting to
> connect to your local hardhat network: `could not detect network`.
>
> The `create-airnode-secrets` script will handle this for you on Mac, Windows, and WSL.

Refer to the [documentation](https://docs.api3.org/reference/airnode/latest/understand/configuring.html) for more
details.

#### 9. (Only if deploying to a cloud provider) Deploy Airnode

Now you're ready to deploy Airnode on the cloud provider. To proceed, run:

```sh
yarn deploy-airnode
```

This command will use the released deployer Docker image corresponding to the tag checked out during [Setup](#setup).
The image itself is based on the [deployer](https://github.com/api3dao/airnode/tree/master/packages/airnode-deployer)
package. Note that deployment may take some time and should not be interrupted. Please be patient.

If you are a developer and would like to use a different deployer Docker image, provide the full image name as an
additional argument. For example:

```sh
yarn deploy-airnode api3/airnode-deployer-dev:bb9b8118940ec852c4223b13eba5a6eb97aa3b97
```

#### 10. (Only if running Airnode locally) Run the Airnode container

```sh
yarn run-airnode-locally
```

This command will use the released client Docker image corresponding to the tag checked out during [Setup](#setup). Note
that the containerized version runs a cron job which triggers every minute - this means that Airnode logs won't start
appearing immediately.

If you are a developer and would like to use a different client Docker image, provide the full image name as an
additional argument. For example:

```sh
yarn run-airnode-locally api3/airnode-client-dev:bb9b8118940ec852c4223b13eba5a6eb97aa3b97
```

#### 11. Deploy a requester

At this point, you have an RRP contract deployed. You will also either have Airnode running as a Docker container
locally or deployed to a cloud provider. Airnode is now listening for events (requests to be made) from the RRP
contract. Requests via the RRP contract originate from requester contracts and therefore a requester contract will need
to be deployed in order to make an on-chain request to your Airnode instance.

To deploy a requester contract, run:

```sh
yarn deploy-requester
```

#### 12. Derive and fund the sponsor wallet

Airnode requests require a [sponsor](https://docs.api3.org/reference/airnode/latest/concepts/sponsor.html), which will
pay for the response transaction made by Airnode. Each sponsor has a dedicated wallet for a given Airnode. This wallet
is called a "sponsor wallet" and can be derived from a sponsor address and Airnode's extended public key with the
[admin CLI package](https://github.com/api3dao/airnode/tree/master/packages/airnode-admin). Refer to the
[documentation](https://docs.api3.org/reference/airnode/latest/developers/requesters-sponsors.html#how-to-derive-a-sponsor-wallet)
for more details.

To derive and fund the sponsor wallet, run:

```sh
yarn derive-and-fund-sponsor-wallet
```

This script will first derive the sponsor wallet and then fund it with 0.1 ETH. This means that your account (derived
from the mnemonic by `choose-integration` script) must have enough funds.

#### 13. Allow the sponsor to pay for requests made by the requester

In order to prevent misuse, each sponsor has to explicitly approve a requester. Once the requester is approved, requests
can be paid by this sponsor.

```sh
yarn sponsor-requester
```

#### 14. Make the request

The last step is to trigger an Airnode request using the requester contract:

```sh
yarn make-request
```

This command will create a transaction which calls a function on the requester contract. The requester contract will
emit an event in response, which Airnode will detect during its next cycle. On receipt of this request event, Airnode
will perform the associated API call and submit the response back on chain. The above command will wait for all of this
to take place and once the request has been fulfilled the output will be sent to the terminal.

#### 15. (Optional) Make a withdrawal request

Withdrawal requests instruct the Airnode return the funds of particular sponsor wallet back to the sponsor. This step is
useful when testing on public testnets. To execute a withdrawal request run:

```sh
yarn make-withdrawal-request
```

#### 16. (Only if deploying to a cloud provider) Remove Airnode from the cloud provider

If you wish to tear down the Airnode from the cloud provider run:

```sh
yarn remove-airnode
```

This will use the deployer to remove the Airnode functions from the cloud provider.

#### 17. (Only if running Airnode locally) Stop the Airnode container

If you wish to stop the Airnode container running locally run:

```sh
yarn stop-local-airnode
```

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

The examples package is a nice fit for an end-to-end test of the entire Airnode infrastructure. We are using this to
test the Airnode client docker image using a hardhat network with one of the basic examples.

When running locally, make sure to build the image yourself before running the test. This test also runs on CI, where
the Airnode client image is built automatically.
