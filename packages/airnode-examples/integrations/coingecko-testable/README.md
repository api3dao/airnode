# Coingecko-testable example integration

> This feature is only available when Airnode is deployed on AWS

This example contains the same API integration as `../coingecko`.

The only difference is that this integration allows the endpoint to be tested. This means you can deploy the Airnode and
then use CLI tools to trigger API requests without touching the blockchain. Refer to the
[docs](https://docs.api3.org/airnode/latest/grp-providers/guides/build-an-airnode/http-gateway.html) for more
information.

## Testing the API call

You can trigger the API call with a POST request. For example, you can use `curl` in the terminal:

```sh
curl -X POST -H 'x-api-key: <HTTP_GATEWAY_API_KEY>' -d '{"parameters": {"coinId": "bitcoin"}}' '<HTTP_GATEWAY_URL>/<ENDPOINT_ID>'
```

Before making the request, you need to replace the example values:

- `<HTTP_GATEWAY_API_KEY>` - You can find this value in `secrets.env`
- `<HTTP_GATEWAY_URL>` - You can find this value in `receipt.json` under `api.httpGatewayUrl` path
- `<ENDPOINT_ID>` - You can find this value in `config.json` under `triggers.rrp[0].endpointId` path

The correct command may look like this:

```sh
curl -X POST -H 'x-api-key: 05701bc4-4eb4-4f60-b4eb-075c80ea98c6' -d '{"parameters": {"coinId": "bitcoin"}}' 'https://x9sidy9ln0.execute-api.us-east-1.amazonaws.com/v1/test/0xd9e8c9bcc8960df5f954c0817757d2f7f9601bd638ea2f94e890ae5481681153'
```
