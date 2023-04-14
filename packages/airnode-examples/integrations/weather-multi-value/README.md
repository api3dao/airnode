# Authenticated, Multiple Encoded Value OpenWeather Example Integration

This authenticated OpenWeather historical weather data example builds upon the foundations of the authenticated
CoinMarketCap example by incorporating the encoding of multiple reserved parameters, which Airnode extracts and converts
separately.

As this is an authenticated example, you will need to sign up with [OpenWeather](https://openweathermap.org/api) in
order to get a free API key. After creating the key, be sure to wait for some time until the API key becomes active. In
our testing 1 hour was enough, but this might change in the future. The `yarn create-airnode-secrets` step will request
this key and store it in `secrets.env`.

Before proceeding with this example, use the curl command below to confirm the API key is active. Note you need to
replace `MYKEY` with your API key. Also note the quotes surrounding the URL are required.

```sh
curl "https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=51.507222&lon=-0.1275&dt=1637545002&appid=MYKEY"
```

_(Make sure the `dt` argument is fresh enough, not older then 5 days)._

New to this example is the encoding of reserved parameters with multiple values of different types. In `config.json`,
the `_type` reserved parameter is a comma-separated string with the following "split values":

1. The datetime of sunset encoded as a `uint256`
2. The temperature encoded as an `int256`
3. The current weather e.g. "Clouds" encoded as a `string`
4. The `timestamp`, which corresponds to when a transaction was encoded, encoded as a `uint256`.

Note the comma-separated `_path` reserved parameter only has three "split values" as `timestamp` should not include a
`_path` value. Lastly, the comma-separated `_times` reserved parameter illustrates that only the temperature (the second
"split value") is multiplied by a value, which is necessary in order to handle the floating point temperature returned
by OpenWeather. Each of these reserved parameters has a corresponding mapping in the
`../../contracts/weather-multi-value/Requester.sol` requester contract.

Refer to the docs for more information on
[how the Airnode is configured](https://docs.api3.org/reference/airnode/latest/understand/configuring.html) and
[reserved parameters](https://docs.api3.org/reference/airnode/latest/specifications/reserved-parameters.html), including
encoding multiple values.
