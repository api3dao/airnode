# Coingecko HTTP gateways example integration

This example contains the same API integration as `../coingecko`.

The only difference is that this integration allows the endpoint to return either unsigned or signed data via the HTTP
gateway or HTTP signed data gateway, respectively.

For more details, see the documentation for the
[HTTP gateways](https://docs.api3.org/reference/airnode/latest/understand/http-gateways.html).

## HTTP gateway

### Trigger a request

You can trigger the API call with a POST request. For example, you can use `curl` in the terminal:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' '<HTTP_GATEWAY_URL>/<ENDPOINT_ID>'
```

#### When deployed on cloud

Before making the request, you need to replace the example values:

- `<HTTP_GATEWAY_URL>` - You can find this value as part of the terminal output of the `yarn deploy-airnode` command
- `<ENDPOINT_ID>` - You can find this value in `config.json` under `triggers.rrp[0].endpointId` path

The correct command may look like this:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' 'https://x9sidy9ln0.execute-api.us-east-1.amazonaws.com/v1/d6ed7e8b-40fa-1392-3e4a-37e225ccda20/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

#### When running Airnode locally

When Airnode is run locally, the HTTP gateway endpoint is always
`http://localhost:<PORT>/http-data/01234567-abcd-abcd-abcd-012345678abc/<ENDPOINT_ID>`.

For example:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' 'http://localhost:3000/http-data/01234567-abcd-abcd-abcd-012345678abc/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

## HTTP signed data gateway

### Encode parameters

The coingecko endpoint expects a parameter `coinId` which needs to be passed to the signed data gateway encoded using
[Airnode ABI](https://docs.api3.org/reference/airnode/latest/specifications/airnode-abi.html).

We have encoded two basic parameter types:

- `[{ type: 'string32', name: 'coinId', value: 'bitcoin' }]` -
  `0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000`
- `[{ type: 'string32', name: 'coinId', value: 'ethereum' }]` -
  `0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000657468657265756d000000000000000000000000000000000000000000000000`

Feel free to encode a different parameter type to make a different request.

### Trigger a request

You can trigger the API call with a POST request. For example, you can use `curl` in the terminal:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"encodedParameters": "0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000"}' '<HTTP_SIGNED_DATA_GATEWAY_URL>/<ENDPOINT_ID>'
```

#### When deployed on cloud

Before making the request, you need to replace the following placeholders:

- `<HTTP_SIGNED_DATA_GATEWAY_URL>` - You can find this value as part of the terminal output of the `yarn deploy-airnode`
  command
- `<ENDPOINT_ID>` - You can find this value in `config.json` under `triggers.httpSignedData[0].endpointId` path. It can
  be derived using the Admin CLI command `derive-endpoint-id` described further
  [here](https://docs.api3.org/reference/airnode/latest/packages/admin-cli.html#derive-endpoint-id)

The correct command may look like this:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"encodedParameters": "0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000"}' 'https://am6ncplkx4.execute-api.us-east-1.amazonaws.com/v1/d6ed7e8b-40fa-1392-3e4a-37e225ccda20/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

#### When running Airnode locally

When Airnode is run locally, the HTTP signed data gateway endpoint is always
`http://localhost:<PORT>/http-signed-data/01234567-abcd-abcd-abcd-012345678abc/<ENDPOINT_ID>`. For now, `PORT` number is
hardcoded to 3000.

For example:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"encodedParameters": "0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000"}' 'http://localhost:3000/http-signed-data/01234567-abcd-abcd-abcd-012345678abc/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

### Output

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
