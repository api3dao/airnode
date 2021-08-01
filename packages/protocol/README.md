# Monorepo version: `@api3/protocol`
# Stand-alone version: `@api3/airnode-protocol`

> The contracts that implement the Airnode protocols

***This documents the Beta version of the protocol.
We have also published and documented the pre-alpha version widely.
The pre-alpha and the Beta versions are very different in implementation and the terminology they use is contradictory.
If you are referring to any outside source, make sure that it is not referring to the pre-alpha version, or at least interpret it accordingly.***

## Instructions

Install the dependencies **at the repo root** (i.e., `airnode/`)
```sh
yarn run bootstrap
# Move into the protocol package
cd packages/protocol
```

Build the contracts
```
yarn run build:contracts
```

Test the contracts, get test coverage and gas report
```sh
yarn run test
# Outputs to `./coverage`
yarn run test:coverage
# Outputs to `.gas_report`
yarn run test:gas
```

Note that the scripts at the repo root and the CI/CD runs may fail.
This is because the rest of the repo is currently outdated.
At this stage, consider this as a standalone package.

## Introduction

At a high level, there are two Airnode protocols:

1. Request–response protocol (RRP): When a user calls a typical, synchronous API, they get a response right after.
In other words, the requester *pulls* the data.
RRP is to integrate such API calls to smart contracts.
2. Publish–subscribe protocol (PSP): There is another API pattern typically referred to as pub/sub or webhooks, where the user asks the API to call back with a specified payload when a specified condition is satisfied.
In this scheme, the API *pushes* the data.
PSP is to build such functionality out of an arbitrary API and integrate it to smart contracts.

Currently, only RRP is implemented, and PSP is only designed at a conceptual level.
Nevertheless, the package's directory structure is designed in anticipation of the PSP implementation.

The protocols are extended in functionality through *authorizers*.
An authorizer is an on-chain contract that can be called statically to check if a particular request should be responded to (e.g., if its requester is whitelisted).
While deploying an Airnode, the operator specifies the addresses of the authorizer contracts they want to use.
Then, whenever an Airnode receives a request, it will make a static call to its authorizers to determine if it should respond to the request.

The contracts that use the Airnode protocol to make API calls are called *requesters*.
A requester can be a user-facing contract such as a prediction market dapp.
Other requesters may build more complex services that use individual Airnode services as components.
For example, a *dAPI* (decentralized API) integrates to multiple Airnodes and is used to give aggregated responses to requests (dAPIs are not yet implemented).
Similarly, a beacon server is a proxy in front of Airnodes that allows responses to be reused repeatedly by authorized parties.

Both authorizers and service providing requesters require complex clearance functionality for multiple independent entities, e.g., if we are implementing a contract that controls access to Airnodes, the admin for an Airnode should not necessarily be an admin for another one.
Therefore, the Airnode protocol package also includes contracts that implement ranked admin functionality for multiple independent entities, and these contracts can be easily extended to build various kinds of admin logic.

## Directory structure

The contracts are under the `contracts/` directory.

`/admin`: Houses the contracts that implement the admin functionality mentioned above.
The contracts in this directory are not RRP-specific and are expected to be reused.
- `/admin/RankedAdminnable.sol`: Implements ranked admins.
This contract cannot be used in a standalone way, it needs to be inherited and seeded with admins, which can then elevate other addresses to admin ranks.
- `/admin/MetaAdminnable.sol`: Inherits `RankedAdminnable` and extends it by defining a *metaAdmin*, which is the highest ranking admin across all adminned entities.
- `/admin/Whitelister.sol`: Inherits `RankedAdminnable` and implements absolute or time-limited whitelisting of addresses for multiple independent services.

`/rrp`: Houses the contracts that implement RRP and related contracts such as authorizers and requesters
- `rrp/AirnodeRrp.sol`: Implements the request–response loop of the protocol and inherits the three other contracts below
- `rrp/AuthorizationUtils.sol`: Implements convenience functions that allow the Airnode to make batch authorization checks
- `rrp/TemplateUtils.sol`: Implements the request template functionality, which allows the reuse of previously declared request parameters
- `rrp/WithdrawalUtils.sol`: Implements the request–response loop for withdrawals from sponsor wallets

  `rrp/authorizers/`: Houses the RRP-specific authorizer contracts
  - `rrp/authorizers/RequesterRrpAuthorizer.sol`: A general type of RRP authorizer that authorizes based on if the requester address is whitelisted at static call-time according to the inherited `Whitelister` logic
  - `rrp/authorizers/SelfRequesterRrpAuthorizer.sol`: Inherits `RequesterRrpAuthorizer` and treats each Airnode's address as its respective highest ranking admin.
  This contract does not inherit `MetaAdminnable`, i.e., the Airnodes are completely self-sovereign regarding authorization. 
  - `rrp/authorizers/Api3RequesterRrpAuthorizer.sol`: Inherits `RequesterRrpAuthorizer` and `MetaAdminnable` to assign the API3 DAO as the highest ranking admin across all Airnodes.
  Unlike all of the contracts above, this contract does not differentiate between Airnodes regarding adminship.

  `rrp/requesters/`: Houses the RRP-depending requester contracts
  - `rrp/requesters/RrpRequester.sol`: A contract that is meant to be inherited by any contract that will be making requests to `AirnodeRrp`
  - `rrp/requesters/RrpBeaconServer.sol`: A proxy contract that makes  RRP requests for request templates.
  The most recent response for each template is stored and can be accessed by whitelisted users.

## Unique patterns

Airnode protocols follow some patterns that you may be unfamiliar with even if you are familiar with existing oracle protocols.
Below are some brief explanations in no particular order, which should help you with understanding the reasoning behind these decisions.
You can also refer to the post [*Where are the first party oracles?*](https://medium.com/api3/where-are-the-first-party-oracles-5078cebaf17) for more information.

### No duplicated contracts

The RRP protocol and its authorizer contracts are deployed once per-chain, and all Airnodes use the same set of contracts.
The contracts are implemented in a way that they are entirely trustless and permissionless, and not even the API3 DAO has any special privileges (except for `Api3RequesterRrpAuthorizer`, which is opt-in, as all authorizers).

In other words, the Airnode operators do not need to deploy any contracts in the regular user flow.
This is preferred because deploying contracts causes a lot of UX friction and costs a lot of gas.
Furthermore, the requester now has to verify that the individually-deployed contracts are not tampered with, which is not possible to do in a trustless way.
Implementing the protocol as a single, communal contract solves these problems.

### Transactions that Airnode operators need to do explicitly are optional

In some cases, even needing to make a single transaction causes significant friction for onboarding Airnode operators (or looking at it from the other way, it would be extremely convenient to onboard Airnode operators if they never had to make any transactions).
This is why the protocol is implemented in a way to avoid this.

There is an optional transaction that the Airnode operator can make to announce their Airnode's extended public key (which the sponsor wallets can be derived from) on-chain.
This information is not required for the protocol to be used, and the Airnode operator may announce this through off-chain channels, e.g., through a listing service, or in their docs.
Therefore, the transaction to announce this parameter is optional.

### Requester sponsors all gas costs

Oracles need to make transactions to affect chain state, which comes with gas costs.
This has extremely significant financial, accounting and regulation implications that make first-party oracles impossible in practice.
Airnode protocols are implemented in a way that enables the requester to sponsor all gas costs related to their service and goes as far as baking this into the lowest level of the protocol.

### IDs work across chains

Airnodes are identified by the address of the default BIP 44 wallet (`m/44'/60'/0'/0/0`) derived from its seed.
This means that if the Airnode uses the same seed on another chain (which they are expected to), the Airnode will have the same ID.
In other words, the Airnode operator has to broadcast only a single ID as their own, this will be used universally across all chains.

### Be mindful of Ethereum provider interactions

Oracle protocols typically assume the Ethereum provider to be trustworthy and infinitely capable, which is typically not the case in reality.
Looking at it from the security side, an external Ethereum provider can tamper with data returned from static calls and log queries, but it cannot tamper with a signed transaction, it can only deny service.
The guarantee we provide for Airnode is similar: A malicious Ethereum provider cannot have you misreport (i.e., tamper with the request parameters secretly), because all request parameters (and request template parameters) are hashed to be verifiable by the respective Airnode.
Note that this is not typical with other oracle protocols, even though it could be foreseen that most independent oracles will be using external Ethereum providers.

A second potential issue with Ethereum providers is capacity.
Most Ethereum providers measure usage by number of calls (likely because of the overhead the alternatives create), so an oracle node should strive to make as few calls as possible (we should note that static calls to on-chain authorizers are seen as a must-have here).
For RRP, this is achieved by implementing convenience functions that make batch calls.
Furthermore, it is typical for Ethereum or EVM-compatible chain providers to apply arbitrary and strict limitations to log fetching calls (i.e., `eth_getLogs`).
To avoid this causing breaking issues, data that could have been kept as logs are sometimes kept in storage despite the increased gas cost (e.g., templates could have been logged instead of written to storage).

### Usability and future-proofness over over-optimization

This last point is a bit abstract, yet has guided us through a number of decisions: When needed to choose between a slight gas cost optimization and improved upgradability in protocol, we opted for the latter.
The reasoning here is that there is virtually infinite potential value to be unlocked with a highly-capable oracle protocol, and sacrificing this to optimize for a limited use-case is short-sighted.
An example can be given as `fulfill()` in `AirnodeRrp` being fulfilled with a `bytes` type that needs to be decoded (which adds a gas cost overhead), where most users will have the request return a single 32 bytes-long type.
Even though this decoding operation overhead will recur a lot, it is still negligible compared to the value that will be created by an oracle protocol that allows flexible response specifications (a simple example is returning multiple fields from an API response).

## RRP flow

1. The Airnode operator generates an HD wallet seed.
The address of the default BIP 44 wallet (`m/44'/60'/0'/0/0`) derived from this seed is used to identify the Airnode.
The Airnode (referring to the node application) polls `AirnodeRrp` for `MadeTemplateRequest` and `MadeFullRequest` events indexed by its own identifying address (and drops the ones that have matching `FulfilledRequest` and `FailedRequest` events).

Note that the Airnode operator may not announce its extended public key on-chain, in which case it would have to do it through off-chain channels.

2. A developer decides to build a contract that makes requests to a specific Airnode (we will call this contract *requester*).
Using the `xpub` of the Airnode and the address of an Ethereum account they control, the developer derives the address of their sponsor wallet (see below for how this is done).
The developer funds this sponsor wallet, then calls `setSponsorshipStatus()` in `AirnodeRrp` with the address of their requester contract to sponsor it.
This means the developer is now the *sponsor* of their requester contract, i.e., the requester contract can make Airnode requests that will be fulfilled by their sponsor wallet.

3. Before making a request, the developer should make sure that at least one of the authorizer contracts that the Airnode is using will authorize the request.
Assume the Airnode is using `SelfRequesterRrpAuthorizer` and `Api3RequesterRrpAuthorizer`.
Then, the requester contract should be whitelisted either by one of the admins that the Airnode default BIP 44 wallet has appointed (i.e., by `SelfRequesterRrpAuthorizer`) or one of the admins that the API3 DAO has appointed (i.e., by `Api3RequesterRrpAuthorizer`).
These admins may whitelist requester contracts based on arbitrary criteria (e.g., if an on-chain payment or an off-chain agreement has been made) and these are outside of the scope of this package.

4. The requester contract can make two kinds of requests:
    - Template requests refer to a set of request parameters that were previously recorded on-chain. To be able to make a template request, the developer will call `createTemplate()` to create the template, then refer to the ID of this template in their template request.
    - Full requests do not refer to any template, all request parameters are provided at request-time.

    Let us assume the requester contract is called, which triggers a template request.

5. The Airnode sees a `MadeTemplateRequest` event (and no matching `FulfilledRequest` or `FailedRequest` event), which means there is a request to be responded to.
It first uses the fields provided in the `MadeTemplateRequest` log to recreate the `requestId`.
If the newly created `requestId` does not match the one from the log, this means that the request parameters are tampered with and the request should not be responded to.
Then, it fetches the template referred to with `templateId`, and using the fields of the template, it recreates the `templateId`.
If the newly created `templateId` does not match the one from the log, this means the template parameters are tampered with and the request should not be responded to.

Another test that the Airnode must do is to derive the sponsor wallet that is specified in the request using the requester address and check if it is correct (and not respond if it is not).
This is done because we cannot derive the sponsor wallet from `xpub` on-chain, so we let the requester specify it in the request, and have the Airnode check it for correctness, which is equally secure (i.e., it will be obvious if one attempts to make a request to be fulfilled by a sponsor wallet that they are not authorized to use).

6. Assuming all tests pass (and they are expected to virtually every time), the Airnode makes a static call to its authorizer contracts with the request parameters, and only continues if at least one of these returns `true`, i.e., says that the request is authorized.
Assuming that the requester contract developer has done Step 3, one of the authorizers will have whitelisted the requester contract and will return `true`.

7. The Airnode makes the API call specified by the request (with an `endpointId` and ABI-encoded `parameters`) and encodes the payload as specified by the request (these specifications are outside the scope of this package).
Then, the Airnode calls `fulfill()` of `AirnodeRrp`, which forwards this call to the callback function in the destination address.
The callback function can be as flexible as needed, but note that the gas cost of execution will be undertaken by the sponsor wallet.

If anything goes wrong during this flow, the Airnode still calls back with a non-zero `statusCode` and an empty `data` field.
However, there are some cases where this is not possible, e.g., the specified sponsor wallet does not match the requester address or the function to be called back reverts.
Then, the Airnode calls the `fail()` function of `AirnodeRrp`, essentially reporting that it could not even attempt to fulfill the request, which the requester can then check for.

## Sponsor wallet derivation

An Ethereum address is 20 bytes-long, which makes 160 bits.
Each index in the HD wallet non-hardened derivation path goes up to 2^31.
Then, we can divide these 160 bits into six 31 bit-long chunks and the derivation path for a sponsor wallet of a requester would be:

```js
m / 0 / requester && 0x7FFFFFFF / (requester >> 31) && 0x7FFFFFFF / (requester >> 62) && 0x7FFFFFFF / (requester >> 93) && 0x7FFFFFFF / (requester >> 124) && 0x7FFFFFFF / (requester >> 155) && 0x7FFFFFFF
```

Anyone can use the `xpub` that the Airnode has announced (through on-chain or off-chain channels) and the sponsor's address to derive a sponsor wallet address for a specific Airnode–sponsor pair.

Note that the derivation path starts with `m/0/...`.
The zero here is allocated for RRP, and the other branches will be used to derive the sponsor wallets for other protocols such as PSP.

## Withdrawal from the sponsor wallet

Requesters may not want to use up all the ETH deposited in their sponsor wallet.
Then, they can use `WithdrawalUtils` to request a withdrawal from the Airnode, which sends the entire balance of the sponsor wallet to the specified address.
Unlike template and full requests, there are no parameters that the Ethereum provider can tamper with, which is why withdrawal requests/fulfillments do not make similar hash checks.
