# Authenticated, Multiple Encoded Value OpenWeather Example Integration

This authenticated OpenWeather historical weather data example builds upon the foundations of the authenticated
CoinMarketCap example by incorporating the encoding of multiple reserved parameters, which Airnode extracts and converts
separately.

As this is an authenticated example, you will need to sign up with OpenWeather in order to get a free API key. Like the
CoinMarketCap example, the `yarn create-airnode-secrets` step will request this key and store it in `secrets.env`.

New to this example is the encoding of reserved parameters with multiple values of different types. In `config.json`,
the `_type` reserved parameter is a comma-separated string with the following "split values":

1. The datetime of sunset encoded as a `uint256`
2. The temperature encoded as an `int256`
3. The current weather e.g. "Clouds" encoded as a `string`
4. The `timestamp`, which corresponds to when a transaction was encoded, encoded as a `uint256`.

Note the comma-separated `_path` reserved parameter only has three "split values" as `timestamp` should not include a
`_path` value. Lastly, the comma-separated `_times` reserved parameter illustrates that only the temperature (the second
"split value") is multiplied by a value, which is necessary in order to handle the floating point temperature returned by
OpenWeather. Each of these reserved parameters has a corresponding mapping in the
`../../contracts/weather-multi-value/Requester.sol` requester contract.

Refer to the docs for more information on
[how the Airnode is configured](https://docs.api3.org/airnode/v0.3/grp-providers/guides/build-an-airnode/configuring-airnode.html)
and [reserved parameters](https://docs.api3.org/airnode/v0.3/reference/specifications/reserved-parameters.html),
including encoding multiple values.
