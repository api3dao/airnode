# Coingecko-signed-data example integration

This example contains the same API integration as `../coingecko`.

The only difference is that this integration allows the endpoint to return signed data that can be submitted on chain by
the to update a beacon.

<!-- TODO: Point to docs when they are finalized -->

## Testing the API call

You can trigger the API call with a POST request. For example, you can use `curl` in the terminal:

```sh
curl -X POST -H 'x-api-key: <HTTP_SIGNED_DATA_GATEWAY_API_KEY>' -d '{"parameters": {"coinId": "bitcoin","\_templateId":"0x6365636b79000000000000000000000000000000000000000000000000000000"}}' '<HTTP_SIGNED_DATA_GATEWAY_URL>/<ENDPOINT_ID>'
```

Before making the request, you need to replace the example values:

- `<HTTP_SIGNED_DATA_GATEWAY_API_KEY>` - You can find this value in `secrets.env`
- `<HTTP_SIGNED_DATA_GATEWAY_URL>` - You can find this value in `receipt.json` under `api.httpSignedDataGatewayUrl` path
- `<ENDPOINT_ID>` - You can find this value in `config.json` under `triggers.httpSignedData[0].endpointId` path

The correct command may look like this:

```sh
curl -X POST -H 'x-api-key: 5da75575-e1c0-40ce-b2eb-5b9dcd2a460b' -d '{"parameters": {"coinId": "bitcoin", "_templateId":"0x6365636b79000000000000000000000000000000000000000000000000000000"}}' 'https://3kailg4d24.execute-api.us-east-1.amazonaws.com/v1/0xd9e8c9bcc8960df5f954c0817757d2f7f9601bd638ea2f94e890ae5481681153'
```
