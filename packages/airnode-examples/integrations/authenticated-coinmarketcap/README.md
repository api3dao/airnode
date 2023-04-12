# Authenticated CoinMarketCap Example Integration

This CoinMarketCap cryptocurrency price example builds upon the foundations of the CoinGecko example by incorporating
authentication with an `apiKey` security scheme.

In order to focus on authentication, many of the other aspects of this example are similar to the CoinGecko example
including a single Ethereum price endpoint, the `_times` reserved parameter for handling floating point prices, and much
of the `secrets.env` file.

New to this example is a `config.json` security scheme that authenticates a request with CoinMarketCap via their
preferred method: a request header named `X-CMC_PRO_API_KEY`. Your API key, which you can get with a free Basic account,
is provided as a value via interpolation of the `CMC_PRO_API_KEY` variable defined in `secrets.env`.

For more information about how the Airnode is configured refer to the
[docs](https://docs.api3.org/reference/airnode/latest/understand/configuring.html).
