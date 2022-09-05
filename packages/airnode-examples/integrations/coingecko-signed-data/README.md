# Coingecko-signed-data example integration

This example contains the same API integration as `../coingecko`.

The only difference is that this integration allows the endpoint to return signed data that can be then submitted on
chain.

See the documentation for the
[signed data gateway](https://docs.api3.org/airnode/latest/grp-providers/guides/build-an-airnode/http-gateways.html#http-signed-data-gateway).

## Encode parameters

The coingecko requests expects a parameter `coinId` which needs to be passed to the gateway encoded using
[Airnode ABI](https://docs.api3.org/airnode/latest/reference/specifications/airnode-abi-specifications.html).

We have encoded two basic parameter types:

- `[{ type: 'string32', name: 'coinId', value: 'bitcoin' }]` -
  `0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000`
- `[{ type: 'string32', name: 'coinId', value: 'ethereum' }]` -
  `0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000657468657265756d000000000000000000000000000000000000000000000000`

Feel free to encode a different parameter type to make a different request.

## Trigger a request

You can trigger the API call with a POST request. For example, you can use `curl` in the terminal:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"encodedParameters": "0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000"}' '<HTTP_SIGNED_DATA_GATEWAY_URL>/<ENDPOINT_ID>'
```

### When deployed on cloud

Before making the request, you need to replace the following placeholders:

- `<HTTP_SIGNED_DATA_GATEWAY_URL>` - You can find this value as part of the terminal output of the `yarn deploy-airnode`
  command
- `<ENDPOINT_ID>` - You can find this value in `config.json` under `triggers.httpSignedData[0].endpointId` path. It can
  be derived using the Admin CLI command `derive-endpoint-id` described further
  [here](https://docs.api3.org/airnode/latest/reference/packages/admin-cli.html#derive-endpoint-id)

The correct command may look like this:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"encodedParameters": "0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000"}' 'https://am6ncplkx4.execute-api.us-east-1.amazonaws.com/v1/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

### When running Airnode locally

When Airnode is run locally, the HTTP signed data gateway endpoint is always
`http://localhost:<PORT>/http-signed-data/<PATH_KEY>/<ENDPOINT_ID>`. For now, `PORT` number is hardcoded to 3000. The
`PATH_KEY` is a random UUID generated when the server is started and can be found in the logs after the container is
run.

For example:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"encodedParameters": "0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000"}' 'http://localhost:3000/http-signed-data/664f6a73-ff1d-411b-aec7-f054fb2e3d9d/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

## Output

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
