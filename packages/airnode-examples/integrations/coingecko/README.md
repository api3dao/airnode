# Coingecko example integration

This is the most basic example showcasing `config.json` and `secrets.env` (which is automatically generated for you with
one of our scripts).

The `config.json` defines a single callable endpoint, called `coinMarketData` which you can call to determine the
current price of some crypto currency. The example request uses this endpoint to retrieve the current price of Ethereum.

There is one thing to notice. The `config.json` defines the `_times` reserved parameter, which makes the Airnode
multiply the asset price returned from the API. This is necessary to preserve the floating point digits in the requester
contract, since solidity only allows to use integers.

For more information about how the Airnode is configured refer to the
[docs](https://docs.api3.org/reference/airnode/latest/understand/configuring.html).
