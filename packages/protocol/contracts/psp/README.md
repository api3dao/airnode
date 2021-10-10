## PSP Notes

Currently, most DeFi products depend on a live data point provided by a passive oracle service, and keepers to trigger actions automatically based on the data provided by the oracle, e.g., liquidate a user that has shorted an asset that has increased in price. PSP allows Airnode to act as an oracle and a keeper rolled into one, and provide services that are not available with the oracle + keeper combos that are currently available. From the API integration point-of-view, it imititates an on-chain webhook API, yet does not require the underlying API to be nothing more than a regular REST API.

Even though PSP will enable oracle usage patterns that were not available before, it will also provide a much more permissionless and thus decentralized way of setting up traditional asset price data feeds. In short, one can subscribe to a set of Airnodes to keep individual price feeds up-to-date on a PspBeaconServer contract and update the aggregation when necessary. Although data feeds currently exist, they are not set up through a protocol, but rather through mails being exchanged and meatspace agreements being signed, which is extremely inefficient. Protocolizing setting up first-party oracle-based data feeds across all chains will be a game-changer.

The main difficulty in providing a subscription service is that an API/Airnode can serve a limited number of them at a time (compared to this, RRP is much more scalable). Then, the resource that we must allow the Airnode to manage are these subscription "slots". This slot allocation needs to happen on-chain, programmatically. To achieve this, we implement "allocators", contracts similar to "authorizers" that implement arbitrary business logic that the Airnode operator can choose to opt-in to by adding them in their config file. Note that a requester both needs to have a slot allocated by an allocator, and be authorized by an authorizer to receive service.

The authorizer parameters will be filled as such:
- `requestId`: `subscriptionId`
- `airnode`: `airnode`
- `endpointId`: `endpointId`
- `sponsor`: `sponsor`
- `requester`: `fulfillAddress`
Alternatively, we can refer to the subscriber as the requester (instead of the sponsor), and implement an additional sponsorship layer on top.

For each chain, the config file should specify a list of allocators with the following fields:
- Allocator chain + provider(s)
- Allocator address
- Maximum number of slots
At the start of each cycle, the Airnode will fetch the slots from each allocator contract and proceed to serve the returned subscriptions.

While specifying allocators in their config file, the Airnode operator also specifies the number of slots the allocator should allocate. For example, an API provider can choose to allow an API3-controlled allocator (DaoPspAllocator) to use 5 of their subscription slots, while they allow another payment-based allocator (AirnodeSponsorPspAllocator) to allocate 10 slots. In this configuration, they would be serving a maximum of 15 slots at a time (which should be easily achievable even with a basic setup).