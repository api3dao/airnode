# Coingecko-testable example integration

This example contains the same API integration as `../coingecko`.

The only difference is that this integration allows the endpoint to be tested. First deploy Airnode on cloud provider or
run locally using
[Airnode client docker image](https://docs.api3.org/airnode/latest/grp-providers/docker/client-image.html). Then make an
API request to Airnode.

Refer to the [docs](https://docs.api3.org/airnode/latest/grp-providers/guides/build-an-airnode/http-gateways.html) for
more information.

## Testing the API call

You can trigger the API call with a POST request. For example, you can use `curl` in the terminal:

```sh
curl -X POST -H 'x-api-key: <HTTP_GATEWAY_API_KEY>' -d '{"parameters": {"coinId": "bitcoin"}}' '<HTTP_GATEWAY_URL>/<ENDPOINT_ID>'
```

### When deployed on cloud

Before making the request, you need to replace the example values:

- `<HTTP_GATEWAY_API_KEY>` - You can find this value in `secrets.env`
- `<HTTP_GATEWAY_URL>` - You can find this value as part of the terminal output of the `yarn deploy-airnode` command
- `<ENDPOINT_ID>` - You can find this value in `config.json` under `triggers.rrp[0].endpointId` path

The correct command may look like this:

```sh
curl -X POST -H 'x-api-key: 05701bc4-4eb4-4f60-b4eb-075c80ea98c6' -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' 'https://x9sidy9ln0.execute-api.us-east-1.amazonaws.com/v1/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

### When running Airnode locally

When Airnode is run locally, the HTTP gateway endpoint is always `http://localhost:<PORT>/http-data/<ENDPOINT_ID>`.

For example:

```sh
curl -X POST -H 'x-api-key: 05701bc4-4eb4-4f60-b4eb-075c80ea98c6' -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' 'http://localhost:3000/http-data/0xd9e8c9bcc8960df5f954c0817757d2f7f9601bd638ea2f94e890ae5481681153'
```
