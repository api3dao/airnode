# Docker instructions

1. Build the Docker image (you can skip this step and fetch the pre-built image)
```sh
mv Dockerfile Dockerfile-deployer && \
  mv Dockerfile-client Dockerfile && \
  docker build . -t api3/airnode-client:pre-alpha && \
  mv Dockerfile Dockerfile-client && \
  mv Dockerfile-deployer Dockerfile
```

2. Ensure that your `.env` file looks like [`.env.example`](https://github.com/api3dao/airnode/blob/pre-alpha/packages/node/__dev__/.env.example) and is the current working directory.

3. Also ensure that [`config.json`](https://github.com/api3dao/airnode/blob/pre-alpha/packages/node/__dev__/config.json.example) is also in the current working directory.
Note that `nodeSettings.cloudProvider` should be `local`.

4. The following command runs an airnode client that is invoked every minute

*If you are using Windows, use CMD (and not PowerShell), replace `\` with `^` and `$(pwd)` with `%cd%`.*

```sh
docker run -it --init --rm \
    -v $(pwd):/airnode/out \
    api3/airnode-client:pre-alpha
```

## HealthCheck

The docker image comes with a [healthcheck status](https://docs.docker.com/engine/reference/builder/#healthcheck) that can be used to monitor the health of the `airnode-client`. If the container becomes unhealthy due to any reason, you should view the logs(in case of any errors) and then restart the container.

## Developement

If you're using `airnode-client` with a local hardhat node running on port 8545, please specify the `chains.providers` as 

```
"providers": [
  {
    "name": "evm-local",
    "url": "http://host.docker.internal:8545/"
  }
]
```