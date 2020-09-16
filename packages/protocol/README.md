# @airnode/protocol

> The contracts that implement the Airnode protocol

See the [docs](https://github.com/api3dao/api3-docs) and the [whitepaper](https://github.com/api3dao/api3-whitepaper) for a high level discussion of the protocol.

## Introduction

`Airnode.sol` is a central contract that implements the entire protocol.
It is entirely neutral, i.e., API3 is not its `Owner` or has any privileges.
Therefore, it does not need to be duplicated, and all Airnode users will use the "official" `Airnode.sol` contract that is already deployed on their chain.

Firstly, `Airnode.sol` is a database.
It keeps records of providers, requesters, endpoints, templates and clients (see the [docs](https://github.com/api3dao/api3-docs) for what these are) to be referred to while making requests.

In addition, clients use `Airnode.sol` to make requests, and Airnodes use it to listen for requests made to them.
In this regard, it can be seen as a common oracle contract that all Airnodes use simultaneously.

## Request-response and other protocols

This version of the protocol supports the request-response scheme, i.e., the requester makes a request and the Airnode reponds as soon as possible.
The protocol will later be extended to support other schemes, most notably publish-subscribe.

Additional schemes do not overlap with request-response significantly, and thus are planned to be implemented as separate contracts (e.g., `AirnodeSubscribe.sol`).
In other words, the request-response scheme will soon be finalized and improvements to the protocol will not break it.

## Security & audits

The protocol is not finalized yet to get more input about what additional features we should support.
Therefore, the contracts are not thoroughly tested and audited yet.
Feel free to raise any issues that are not already reported.

## Contributing

Join our Keybase to discuss the protocol and propose updates

https://keybase.io/team/api3
