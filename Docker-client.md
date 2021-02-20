# Docker instructions

1. Build the Docker image
```sh
docker build . -t api3/airnode-client:pre-alpha
```

2. Ensure that your `.env` file looks like [`.env.example`](https://github.com/api3dao/airnode/blob/pre-alpha/packages/node/__dev__/.env.example) and is the current working directory.

3. Also ensure that [`config.json`](https://github.com/api3dao/airnode/blob/pre-alpha/packages/node/__dev__/config.json.example) is also in the current working directory

*If you are using Windows, use CMD (and not PowerShell), replace `\` with `^` and `$(pwd)` with `%cd%`.*

### `deploy client airnode`

The following command runs an airnode client that is invoked every minute

```
docker run -it --rm \
    --env-file .env \
    -v $(pwd):/airnode/out \
    api3/airnode-client:pre-alpha
```

