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
curl -X POST -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' 'https://x9sidy9ln0.execute-api.us-east-1.amazonaws.com/v1/d6ed7e8b-40fa-1392-3e4a-37e225ccda20/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```

### When running Airnode locally

When Airnode is run locally, the HTTP gateway endpoint is always
`http://localhost:<PORT>/http-data/01234567-abcd-abcd-abcd-012345678abc/<ENDPOINT_ID>`.

For example:

```sh
curl -X POST -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "bitcoin"}}' 'http://localhost:3000/http-data/01234567-abcd-abcd-abcd-012345678abc/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4'
```
