# TODO

- Consider not returning anything from `fulfillRequest()` in `ChainApi`

- Convert `require()`s to modifiers wherever applicable

- Hand off adminship/platform agency in two steps in `ProviderStore` and `RequesterStore`

- Use SafeMath or equivalent

# Notes

- `ProviderStore` now allows a single requester to reserve multiple wallets.
There is currently no way for a requester to signal which wallet ID they want to be used to fulfill their request.
This can be done through a `walletInd` reserved parameter passed in `parameters` in the future.
For now, ChainAPI will only regard the first wallet that a requester has reserved from the provider.

- The provider is allowed to use any of their authorized wallets while fulfilling a request, including wallets reserved by other requesters.
This is because the provider is already trusted with the deposited funds, so they can be assumed to use the wallets as intended.

- A third party can reserve a wallet from a provider for a requester.
This is not guarded against because it doesn't pose a risk.

- In general, whether the `templateId`s, `endpointId`s, etc. provided by the caller exist isn't checked.
We can consider checking for this, as long as it doesn't increase the gas cost of the request-fulfill loop.
