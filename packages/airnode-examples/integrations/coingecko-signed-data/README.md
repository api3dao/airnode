# Coingecko-signed-data example integration

This example contains the same API integration as `../coingecko`.

The only difference is that this integration allows the endpoint to return signed data that can be then submitted on
chain.

Note that currently this integration cannot be run with the local Airnode client as it does not yet support http
gateways.

See the documentation for the
[signed data gateway](https://docs.api3.org/airnode/latest/grp-providers/guides/build-an-airnode/http-gateways.html#http-signed-data-gateway).

## Testing the API call

### Encode parameters

The coingecko requests expects a parameter `coinId` which needs to be passed to the gateway encoded using
[Airnode ABI](https://docs.api3.org/airnode/latest/reference/specifications/airnode-abi-specifications.html).

We have encoded two basic parameter types:

- `[{ type: 'string32', name: 'coinId', value: 'bitcoin' }]` -
  `0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000`
- `[{ type: 'string32', name: 'coinId', value: 'ethereum' }]` -
  `0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000657468657265756d000000000000000000000000000000000000000000000000`

Feel free to encode a different parameter type to make a different request.

### Trigger a request

You can trigger the API call with a POST request. For example, you can use `curl` in the terminal:

```sh
curl -X POST -H 'x-api-key: <HTTP_SIGNED_DATA_GATEWAY_API_KEY>' -H 'Content-Type: application/json' -d '{"encodedParameters": "0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000"}' '<HTTP_SIGNED_DATA_GATEWAY_URL>/<ENDPOINT_ID>'
```

Before making the request, you need to replace the following placeholders:

- `<HTTP_SIGNED_DATA_GATEWAY_API_KEY>` - This is a user defined API key to authenticate against the gateway, which must
  be between 30 and 120 characters and is stored in `secrets.env`
- `<HTTP_SIGNED_DATA_GATEWAY_URL>` - You can find this value as part of the terminal output of the `yarn deploy-airnode`
  command
- `<ENDPOINT_ID>` - You can find this value in `config.json` under `triggers.httpSignedData[0].endpointId` path. It can
  be derived using the Admin CLI command `derive-endpoint-id` described further
  [here](https://docs.api3.org/airnode/latest/reference/packages/admin-cli.html#derive-endpoint-id)

The correct command may look like this:

```sh
curl -X POST -H 'x-api-key: 5da75575-e1c0-40ce-b2eb-5b9dcd2a460b' -H 'Content-Type: application/json' -d '{"encodedParameters": "0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000"}' 'https://am6ncplkx4.execute-api.us-east-1.amazonaws.com/v1/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

The example output might look like this:

```json
{
  "data": {
    "timestamp": "1648226003",
    "value": "0x0000000000000000000000000000000000000000000000000000000a571a14c0"
  },
  "signature": "0xa74e4312e2e6fa2de2997ef43e417e3b82d0019ac2a84012300f706f8b213e0d6e1ae9301052ec25b71addae1b1bceb4617779abfc6acd5a951e20a0aaabe6f61b"
}
```

The `value` from which can be decoded using, for example:

```ts
import { ethers } from 'ethers';
const encodedData = '0x0000000000000000000000000000000000000000000000000000000a571a14c0';
const decodedBigNumber = ethers.utils.defaultAbiCoder.decode(['int256'], encodedData)[0];
// which equals: BigNumber { _hex: '0x0a571a14c0', _isBigNumber: true }
// or as a number: 44411000000, which is 44411 multiplied by the `_times` reserved parameter value of 1000000
```
