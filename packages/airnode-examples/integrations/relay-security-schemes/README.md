# Relay security schemes example integration

This example highlights how Airnode can relay request metadata, like the chain ID or sponsor address, to the API
endpoint via security schemes. In order to demonstrate this functionality in a realistic way, the API endpoint used is
[httpbin.org](https://httpbin.org/), which simply responds with request headers and query parameters in JSON format.
This behavior allows request metadata returned in the API response to be fulfilled by Airnode on-chain as proof that the
metadata is being relayed as expected.

The following security scheme types illustrate the request metadata being relayed and, as shown in `config.json`,
demonstrate how the value can be sent via `query`, `header`, and `cookie`:

- relayRequesterAddress
- relaySponsorAddress
- relaySponsorWalletAddress
- relayChainId
- relayChainType
- relayRequestId

For more information on supported security schemes, refer to the
[docs](https://docs.api3.org/reference/airnode/latest/understand/api-security.html).
