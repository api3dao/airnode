# Coingecko pre-processing integration example

This is a basic example showcasing how to use
[preprocessing](https://docs.api3.org/reference/ois/latest/processing.html) to enable an advanced use case which
modifies the endpoint parameters before making the API request to CoinGecko API.

The `config.json` defines a single callable endpoint, called `coinHistoryData` which you can call with different coin ID
and date to determine the historical price at the given date. As a requester you specify the date as UNIX timestamp and
preprocessing snippet will convert it to `dd-mm-yyyy` format which CoinGecko expects.

Overall the process looks like this:

1. A requester makes the API call which Airnode starts to process.
2. Airnode executes the pre-processing code to change the UNIX timestamp parameter to `dd-mm-yyyy` format.
3. This parameter is then used to construct the query of the CoinGecko request.
4. Airnode makes the API call, waits for response, encodes the value and finally submits it on chain.

For more information about how the Airnode is configured refer to the
[docs](https://docs.api3.org/reference/airnode/latest/understand/configuring.html).
