# Coingecko postprocessing integration example

This is a basic example showcasing how to use
[postprocessing](https://docs.api3.org/ois/v1.0.0/ois.html#_5-10-postprocessingspecifications) to enable and advanced
use case which modifies the CoinGecko API response before sending the response on chain.

The `config.json` defines a single callable endpoint, called `coinsMarketData` which you can call with different coin
IDs to determine the average current price and average 30 days percentage change.

Overall the process looks like this:

1. Airnode makes the API call to the CoinGecko API and waits for the response (array of market data for the requested
   coins).
2. Airnode executes the post-processing code to compute the average price and percentage change for all of the coins.
   The post-processing snippets outputs a two element array.
3. Airnode then extracts the values from this array as configured by the `_type` reserved parameter and encodes them.
4. Airnode submits the encoded value on chain

For more information about how the Airnode is configured refer to the
[docs](https://docs.api3.org/airnode/latest/grp-providers/guides/build-an-airnode/configuring-airnode.html).
