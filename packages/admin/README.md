# Monorepo version: `@airnode/admin`
# Stand-alone version: `@api3/airnode-admin`

> A package/CLI tool to interact with the Airnode contracts across chains

Almost all commands require you to provide a `providerUrl` such as `https://ropsten.infura.io/v3/<KEY>`, `https://xdai.poanetwork.dev`, etc.
Currently supported chains are:
- Ropsten
- Rinkeby
- Goerli
- xDai
- Fantom

Commands that require `mnemonic` will make an on-chain transaction.
Make sure that the wallet that is associated with the mnemonic is funded on the target chain.
The application will not exit until the transaction is confirmed.

To see all commands:
```sh
npx @api3/airnode-admin --help
```
To see the parameters of a command:
```sh
npx @api3/airnode-admin $COMMAND --help
```

## Requester commands

### `create-requester`

Creates a [requester](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/requester.md) and returns a requester index.
Note down your requester index because you will be using it in future interactions.

```sh
npx @api3/airnode-admin create-requester \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requesterAdmin 0x5c17cb...
```

### `set-requester-admin`

Sets the [requester admin](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/requester.md#requesteradmin).
The `mnemonic` you provide here has to belong to the previous requester admin.

```sh
npx @api3/airnode-admin set-requester-admin \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requesterIndex 6 \
  --requesterAdmin 0xe97301...
```

### `derive-designated-wallet`

Derives the address of the [wallet designated by an Airnode for a requester](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/designated-wallet.md).

```sh
npx @api3/airnode-admin derive-designated-wallet \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --airnodeId 0xe1e0dd... \
  --requesterIndex 6
```

### `endorse-client`

[Endorses](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/endorsement.md) a client contract so that its requests can be fulfilled by the requester's designated wallet.
The `mnemonic` you provide here has to belong to the requester admin.

```sh
npx @api3/airnode-admin endorse-client \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requesterIndex 6 \
  --clientAddress 0x2c2e12...
```

### `unendorse-client`

Unendorses a client contract so that its requests can no longer be fulfilled by the requester's designated wallet.
The `mnemonic` you provide here has to belong to the requester admin.

```sh
npx @api3/airnode-admin unendorse-client \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requesterIndex 6 \
  --clientAddress 0x2c2e12...
```

### `create-template`

Reads a file, uses its contents to create a [template](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/template.md) and returns the template ID.
See the `/example` directory for an example template file.

```sh
npx @api3/airnode-admin create-template \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --templateFilePath ./template.json
```

### `request-withdrawal`

Requests a [withdrawal](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/designated-wallet.md#withdrawals) from the wallet designated by an Airnode for a requester, and returns the request ID.
The `mnemonic` you provide here has to belong to the requester admin.

```sh
npx @api3/airnode-admin request-withdrawal \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --airnodeId 0xe1e0dd... \
  --requesterIndex 6 \
  --destination 0x98aaba...
```

### `check-withdrawal-request`

Checks the status of the withdrawal request with the given ID.

```sh
npx @api3/airnode-admin check-withdrawal-request \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --withdrawalRequestId 0x011d1b...
```

## Airnode commands

### `set-airnode-parameters`

Sets the parameters of an [Airnode](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/provider.md) and returns the Airnode ID.
See the `/example` directory for an example authorizers file.

**You probably should not be using this.**
Airnode will set its own parameters during [deployment](https://github.com/api3dao/api3-docs/blob/master/provider-guides/deploying-airnode.md) if necessary.

```sh
npx @api3/airnode-admin set-airnode-parameters \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --airnodeAdmin 0xc2193d... \
  --authorizersFilePath ./authorizers.json
```

### `derive-endpoint-id`

Derives the endpoint ID using the OIS title and the endpoint name using the convention described [here](https://github.com/api3dao/api3-docs/blob/master/provider-guides/configuring-airnode.md#triggers).

```sh
npx @api3/airnode-admin derive-endpoint-id \
  --oisTitle "My OIS title..." \
  --endpointName "My endpoint name..."
```
