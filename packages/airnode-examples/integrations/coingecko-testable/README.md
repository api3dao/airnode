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
curl -X POST -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' '<HTTP_GATEWAY_URL>/<ENDPOINT_ID>'
```

### When deployed on cloud

Before making the request, you need to replace the example values:

- `<HTTP_GATEWAY_URL>` - You can find this value as part of the terminal output of the `yarn deploy-airnode` command
- `<ENDPOINT_ID>` - You can find this value in `config.json` under `triggers.rrp[0].endpointId` path

The correct command may look like this:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' 'https://x9sidy9ln0.execute-api.us-east-1.amazonaws.com/v1/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

### When running Airnode locally

When Airnode is run locally, the HTTP gateway endpoint is always
`http://localhost:<PORT>/http-data/<PATH_KEY>/<ENDPOINT_ID>`. The `PATH_KEY` is a random UUID generated when the server
is started and can be found in the logs after the container is run.

For example:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' 'http://localhost:3000/http-data/664f6a73-ff1d-411b-aec7-f054fb2e3d9d/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```
