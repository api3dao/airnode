# Docker instructions

1. Build the Docker image (you can skip this step and fetch the pre-built image)
```sh
mv Dockerfile Dockerfile-deployer \
  mv Dockerfile-client Dockerfile \
  docker build . -t api3/airnode-client:pre-alpha \
  mv Dockerfile Dockerfile-client \
  mv Dockerfile-deployer Dockerfile \
```

2. Ensure that your `.env` file looks like [`.env.example`](https://github.com/api3dao/airnode/blob/pre-alpha/packages/node/__dev__/.env.example) and is the current working directory.

3. Also ensure that [`config.json`](https://github.com/api3dao/airnode/blob/pre-alpha/packages/node/__dev__/config.json.example) is also in the current working directory.
Note that `nodeSettings.cloudProvider` should be `local`.

4. The following command runs an airnode client that is invoked every minute

*If you are using Windows, use CMD (and not PowerShell), replace `\` with `^` and `$(pwd)` with `%cd%`.*

```sh
docker run -it --rm \
    --env-file .env \
    -v $(pwd):/airnode/out \
    api3/airnode-client:pre-alpha
```
