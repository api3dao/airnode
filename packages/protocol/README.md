# TODO

- Consider not returning anything from `fulfill()` in `Airnode.sol`

- Hand off adminship/platformAgency in two steps in `ProviderStore` and `RequesterStore`

- Use SafeMath or equivalent

- Implement an EndpointStorage method to go through authorizers and decide if the requester is allowed to use the endpoint (so that the node has to make a single Ethereum call)

# Notes

- The provider is allowed to use any of their authorized wallets while fulfilling a request.
This is because the provider is already trusted with the deposited funds, so they can be assumed to use the wallets as intended.

- A third party can reserve a wallet from a provider for a requester.
This is not guarded against because it doesn't pose a risk.
