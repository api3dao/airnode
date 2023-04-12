# Coingecko post-processing integration example

This is a basic example showcasing how to use
[postprocessing](https://docs.api3.org/reference/ois/latest/processing.html) to enable an advanced use case which
modifies the CoinGecko API response before sending the response on chain.

The `config.json` defines a single callable endpoint, called `coinsMarketData` which you can call with different coin
IDs to determine the average current price and average 30 days percentage change.

Overall the process looks like this:

1. A requester makes the API call which Airnode starts to process.
2. Airnode makes the API call to the CoinGecko API and waits for the response (array of market data for the requested
   coins).
3. Airnode executes the post-processing code to compute the average price and percentage change for all of the coins.
   The post-processing snippet outputs a two element array.
4. Airnode then extracts the values from this array as configured by the `_type` reserved parameter and encodes them.
5. Airnode submits the encoded value on chain.

For more information about how the Airnode is configured refer to the
[docs](https://docs.api3.org/reference/airnode/latest/understand/configuring.html).
