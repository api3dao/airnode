# Airnode protocol v1

**_This documents the Airnode protocol v1. We have already published Airnode protocol v0, implemented its node and
[documented](https://docs.api3.org/airnode/v0.3) it. You may refer to this documentation to understand the base
concepts, yet note that there may have been changes._**

## Instructions

Install the dependencies **at the repo root** (i.e., `airnode/`)

```sh
yarn run bootstrap
# Move into the protocol package
cd packages/airnode-protocol-v1
```

Build the contracts

```sh
yarn run build:contracts
```

Test the contracts, get test coverage and gas report (note that heap size is increased significantly for these)

```sh
yarn run test
yarn run test:extended
# Outputs to `./coverage`
yarn run test:coverage
# Outputs to `.gas_report`
yarn run test:gas
```

Slither does not like the monorepo + hardhat + OpenZeppelin dependency. You can see `slither_output` for the output of a
very recent run.

## Protocol description

At a high level, there are two Airnode protocols:

1. Request–response protocol (RRP): When a user calls a typical, synchronous API, they get a response right after. In
   other words, the user _pulls_ the data. RRP is to integrate such API calls to smart contracts.
2. Publish–subscribe protocol (PSP): There is another API pattern typically referred to as pub/sub or webhooks, where
   the user asks the API to call back with a specified payload when a specified condition is satisfied. In this scheme,
   the API _pushes_ the data. PSP is to build such functionality out of an arbitrary API and integrate it to smart
   contracts.

RRP is implemented as a single `AirnodeProtocol` contract that the requester and the Airnode communicates through. PSP
is built into the requester contract (e.g., `DapiServer`), which the Airnode interacts with directly.

Both RRP and PSP has _relayed_ versions, where the Airnode cryptographically signs the fulfillment data, and the relayer
sends the fulfillment transaction. In addition to this, there is functionality built into `DapiServer` that allows
signed data to be pushed to the contract without using RRP or PSP, which can be seen as a more abstract type of a
relayed protocol.

_Note that all the following concepts can be hardcoded into the node configuration (so that, for example, a specific
requester is always whitelisted for a specific endpoint). These contracts are an attempt at protocolizing a
[feasible business model for first-party oracles](https://medium.com/api3/where-are-the-first-party-oracles-5078cebaf17)._

### Templates and Subscriptions

A template is an endpoint ID and request parameters encoded in
[Airnode ABI](https://docs.api3.org/airnode/v0.3/reference/specifications/airnode-abi-specifications.html). Templates
are identified by the hash of their contents, which allows requesters to refer to the template ID while making the
request, without needing to pass over the entire content. The template either needs to be stored on-chain (by calling
`storeTemplate()`) or hardcoded in the Airnode configuration file.

Subscriptions define PSP jobs and work in a similar way to templates.

### Sponsorship

Oracles need to make transactions to affect the chain state, which comes with gas costs. This has extremely significant
financial, accounting and regulation implications that make first-party oracles impossible in practice. Airnode
protocols are implemented in a way that enables the requester to sponsor all gas costs related to their service and goes
as far as baking this into the lowest level of the protocol.

You can refer to the [v0 docs](https://docs.api3.org/airnode/latest/concepts/sponsor.html) for the RRP sponsorship
scheme, and the PSP counterpart works in a similar way (except with a different sponsor wallet derivation path). Before
attempting to fulfill a request, the respective Airnode should verify with a static call that the specified sponsor is
willing to sponsor the request.

### Authorizers

The protocols are extended in functionality through _authorizers_. An authorizer is an on-chain contract that can be
called statically to check if a particular request should be responded to, e.g., if its requester is whitelisted. While
deploying an Airnode, the operator specifies the addresses of the authorizer contracts they want to use. (These
contracts may live on a chain different than the protocol contract, e.g., an Airnode can be configured to refer to a
mainnet authorizer for requests received from Rinkeby.) Then, whenever an Airnode receives a request (RRP or PSP), it
will make a static call to its authorizers to determine if it should respond to the request.

### Monetization contracts

A `RequesterAuthorizer` contract allows requester contracts to be whitelisted to use a specific endpoint of an Airnode
through RRP and PSP. The monetization contracts are implemented to automate this process in a way that resembles
traditional API subscriptions. There are mainly two implementations: One that requires the user to deposit tokens as a
riskless stake, and the other that requires regular token payments.

These contracts are planned to work in a cross-chain way: The user deposits API3 tokens at
`RequesterAuthorizerWhitelisterWithTokenDeposit` on Ethereum mainnet, specifying a chain ID. This results in the
requester contract to be whitelisted on the `RequesterAuthorizer` dedicated to that chain (which is also on Ethereum
mainnet). When the respective Airnode receives a request on the specified chain, it checks the respective
`RequesterAuthorizer` on mainnet and see that the requester is whitelisted. This allows:

1. Monetization of testnet access
2. Not requiring API3 to bridge tokens to other chains
3. (For `RequesterAuthorizerWhitelisterWithTokenPayment`) Airnode access to be monetizable on Ethereum mainnet with a
   reliable stablecoin independent from the chain the service is being provided on

### Allocators

An Airnode detects incoming RRP requests by listening to events from `AirnodeProtocol`. The PSP equivalent of this is
checking the Allocator contracts for active subscriptions that need to be served. Similar to Authorizers, Allocators do
not need to be on the same chain as the requester contract, and setting Allocator slots can be programmatically
monetized.

### `withAirnode` vs. `withManager`

You will encounter the `withAirnode` and `withManager` variants of the same contract regularly. We want the Airnode
protocol to be trustless to use, even without relying on the API3 DAO governance. The `withAirnode` contracts implement
this functionality, essentially allowing the `airnode` address to make all the governance decisions about how a
particular Airnode can be used. The `withManager` contracts offload this responsibility to the API3 DAO or its
constituents, which is desirable because most API providers do not want to actively manage a Web3 service, and are not
capable to do so.

Note that whether an Airnode wants to be only managed by themselves or also by the API3 DAO is simply a matter of
configuring Authorizer and Allocator addresses in the deployment configuration. Not requiring the Airnode operators to
make transactions (that are not sponsored by someone else) is a critical requirement for first-party oracles.

### `AccessControlRegistry`

`AccessControlRegistry` is implemented to keep track of all access control roles around managing Airnodes in the same
place. It is typical for individual contracts to implement their own access control functionality independently, yet
this quickly goes out of hand, where a particular multisig or a DAO is the `owner` of multiple contracts and has more
roles than they can keep track of. This is a significant attack surface for large scale systems, which is what the
Airnode protocol is expected to be due to the large number of Airnodes.

## RRP flow

1. The Airnode operator generates an HD wallet seed. The address of the default BIP 44 wallet (`m/44'/60'/0'/0/0`)
   derived from this seed is used to identify the Airnode. The Airnode (referring to the node application) polls
   `AirnodeProtocol` for `MadeRequest` events indexed by its own identifying address (and drops the ones that have
   matching `FulfilledRequest` and `FailedRequest` events).

2. A developer decides to build a contract that makes requests to a specific Airnode (we will call this contract
   _requester_). Using the `xpub` (extended public key) of the Airnode (which is announced off-chain) and the address of
   an Ethereum account they control, the developer derives the address of their sponsor wallet. The developer funds this
   sponsor wallet, then calls `setRrpSponsorshipStatus()` in `AirnodeProtocol` with the address of their requester
   contract to sponsor it. This means the developer is now the _sponsor_ of their requester contract, i.e., the
   requester contract can make Airnode requests that will be fulfilled by their sponsor wallet.

3. Before making a request, the developer should make sure that at least one of the authorizer contracts that the
   Airnode is using will authorize the request. Assume the Airnode is using `RequesterAuthorizerWithAirnode` and
   `RequesterAuthorizerWithManager`. Then, the requester contract must be whitelisted either by one of the admins that
   the Airnode default BIP 44 wallet has appointed (i.e., by `RequesterAuthorizerWithAirnode`) or one of the admins that
   the API3 DAO has appointed (i.e., by `RequesterAuthorizerWithManager`). These admins may whitelist requester
   contracts based on arbitrary criteria (e.g., if an on-chain payment or an off-chain agreement has been made).

4. The developer calls `storeTemplate()` to create a template (or reuses an existing one) and refers to it while making
   a request by calling `makeRequest()`.

5. The Airnode sees a `MadeRequest` event (and no matching `FulfilledRequest` or `FailedRequest` event), which means
   there is a request to be responded to. It first uses the fields provided in the `MadeRequest` log to recreate the
   `requestId`. If the newly created `requestId` does not match the one from the log, this means that the request
   parameters are tampered with and the request must not be responded to. Then, it fetches the template referred to by
   `templateId`, and using the fields of the template, it recreates the `templateId`. If the newly created `templateId`
   does not match the one from the log, this means the template parameters are tampered with and the request must not be
   responded to.

6. Assuming all tests pass (and they are expected to, virtually every time), the Airnode makes a static call to the
   `AirnodeProtocol` to verify that `sponsorToRequesterToRrpSponsorshipStatus` is `true`.

7. The Airnode makes a static call to its authorizer contracts with the request parameters, and only continues if at
   least one of these returns `true`, i.e., says that the request is authorized. Assuming that the requester contract
   developer has done Step 3, one of the authorizers will have whitelisted the requester contract and will return
   `true`.

8. The Airnode makes the API call specified by the request (with an `endpointId` and Airnode ABI-encoded `parameters`)
   and encodes the payload as specified by the request (these specifications are outside the scope of this package). The
   request ID, a timestamp and the sponsor wallet address are signed by the private key of the address that identifies
   Airnode (to prove that the holder of the Airnode private key approves that the fulfiller of the request is the
   sponsor wallet specified in the request). Then, the Airnode calls `fulfillRequest()` of `AirnodeProtocol`, which
   forwards the request ID, timestamp and the payload to the callback function in the requester address. The callback
   function can be as flexible as needed, but note that the gas cost of execution will be undertaken by the sponsor
   wallet.

If anything goes wrong during this flow, the Airnode calls the `failRequest()` function of `AirnodeProtocol` with an
error message that explains what went wrong. For example, if `fulfillRequest()` is going to revert, the node calls back
`failRequest()` and forwards the revert string as the error message for debugging purposes. However, there are some
cases where this is not possible, e.g., the specified sponsor wallet is not funded, in which case the request will not
be responded to at all.

## PSP flow

1. The Airnode fetches their active subscription IDs from its Allocators

2. The Airnode fetches the subscription details from the chain if they have been stored (by calling
   `storeSubscription()`), or the subscription could be hardcoded at the node configuration. It also fetches the
   referenced template. It verifies the integrity of the template and the subscription details by comparing the hash of
   the details to the ID.

3. The Airnode checks `sponsorToSubscriptionIdToPspSponsorshipStatus()` to verify the `sponsor`s specified in the
   subscription details

4. The Airnode checks its Authorizers to verify that the `requester`s specified in the subscription details are
   authorized

5. The Airnode makes the API call specified by the template and the additional parameters

6. Using the response from the API, the Airnode checks if the condition specified in the `conditions` field of the
   subscription is met (in most cases, by making a static call to a function)

7. If the condition is met, the Airnode fulfills the subscription by calling the specified function using the sponsor
   wallet
