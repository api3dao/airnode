# Docker instructions

1. Build the Docker image
```sh
docker build . -t airnode-alpha
```

2. Ensure that your `.env` file looks like [`/packages/deployer/.env.example`](/packages/deployer/.env.example) and is the current working directory.

3. If you will be running [`deploy-first-time`](#deploy-first-time) or [`redeploy`](#redeploy), your `config.json` and `security.json` must be in the current working directory.

4. Run the image with one of the following commands:

### `deploy-first-time`
```sh
docker run -it --rm \
  --env-file .env \
  --env COMMAND=deploy-first-time \
  -v $(pwd):/airnode/out \
  airnode-alpha:latest
```

### `redeploy`

```sh
docker run -it --rm \
  --env-file .env \
  --env COMMAND=redeploy \
  -v $(pwd):/airnode/out \
  airnode-alpha:latest
```

### `deploy-mnemonic`

```sh
docker run -it --rm \
  --env-file .env \
  --env COMMAND=deploy-mnemonic \
  --env MNEMONIC=$MNEMONIC \
  --env REGION=$REGION \
  airnode-alpha:latest
```

Note that you must replace `$MNEMONIC` and `$REGION` with your values.
Enclose your mnemonic in quotation marks because it includes whitespaces.

### `remove-with-receipt`

```sh
docker run -it --rm \
  --env-file .env \
  --env COMMAND=remove-with-receipt \
  --env RECEIPT_FILENAME=$RECEIPT_FILENAME \
  -v $(pwd):/airnode/out \
  airnode-alpha:latest
```

Note that you must replace `$RECEIPT_FILENAME` with your value.
`$RECEIPT_FILENAME` must be in the current working directory.

### `remove-mnemonic`

```sh
docker run -it --rm \
  --env-file .env \
  --env COMMAND=remove-mnemonic \
  --env PROVIDER_ID_SHORT=$PROVIDER_ID_SHORT \
  --env REGION=$REGION \
  airnode-alpha:latest
```

Note that you must replace `$PROVIDER_ID_SHORT` and `$REGION` with your values.

### `remove-airnode`

```sh
docker run -it --rm \
  --env-file .env \
  --env COMMAND=remove-airnode \
  --env PROVIDER_ID_SHORT=$PROVIDER_ID_SHORT \
  --env REGION=$REGION \
  --env STAGE=$STAGE \
  airnode-alpha:latest
```

Note that you must replace `$PROVIDER_ID_SHORT`, `$REGION` and `$STAGE` with your values.
