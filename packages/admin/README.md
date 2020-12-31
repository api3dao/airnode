# Monorepo version: `@airnode/admin`
# Stand-alone version: `@api3/airnode-admin`

> A package/CLI tool to interact with the Airnode contracts across chains

All commands require you to either provide a `providerUrl` (e.g., `https://ropsten.infura.io/v3/<KEY>`) or a `chain` (e.g., `ropsten`).
**Using `chain` will use the default ethers.js provider, which may rate-limit you.**
Furthermore, it may not support the chain you want to use (xDai, Fantom, etc.)

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
  --chain ropsten \
  --mnemonic "nature about salad..." \
  --requesterAdmin 0x5c17cb...
```

### `update-requester-admin`

Updates the [requester admin](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/requester.md#requesteradmin).
The `mnemonic` you provide here has to belong to the previous requester admin.

```sh
npx @api3/airnode-admin update-requester-admin \
  --chain ropsten \
  --mnemonic "nature about salad..." \
  --requesterIndex 6 \
  --requesterAdmin 0xe97301...
```

### `derive-designated-wallet`

Derives the address of the [wallet designated by a provider for a requester](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/designated-wallet.md).

```sh
npx @api3/airnode-admin derive-designated-wallet \
  --chain ropsten \
  --providerId 0xe1e0dd... \
  --requesterIndex 6
```

### `endorse-client`

[Endorses](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/endorsement.md) a client contract so that its requests can be fulfilled by the requester's designated wallet.
The `mnemonic` you provide here has to belong to the requester admin.

```sh
npx @api3/airnode-admin endorse-client \
  --chain ropsten \
  --mnemonic "nature about salad..." \
  --requesterIndex 6 \
  --clientAddress 0x2c2e12...
```

### `unendorse-client`

Unendorses a client contract so that its requests can no longer be fulfilled by the requester's designated wallet.
The `mnemonic` you provide here has to belong to the requester admin.

```sh
npx @api3/airnode-admin unendorse-client \
  --chain ropsten \
  --mnemonic "nature about salad..." \
  --requesterIndex 6 \
  --clientAddress 0x2c2e12...
```

### `create-template`

Reads a file, uses its contents to create a [template](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/template.md) and returns the template ID.
See the `/example` directory for an example template file.

```sh
npx @api3/airnode-admin create-template \
  --chain ropsten \
  --mnemonic "nature about salad..." \
  --templateFilePath ./template.json
```

### `request-withdrawal`

Requests a [withdrawal](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/designated-wallet.md#withdrawals) from the wallet designated by a provider for a requester, and returns the request ID.
The `mnemonic` you provide here has to belong to the requester admin.

```sh
npx @api3/airnode-admin request-withdrawal \
  --chain ropsten \
  --mnemonic "nature about salad..." \
  --providerId 0xe1e0dd... \
  --requesterIndex 6 \
  --destination 0x98aaba...
```

### `check-withdrawal-request`

Checks the status of the withdrawal request with the given ID.

```sh
npx @api3/airnode-admin check-withdrawal-request \
  --chain ropsten \
  --withdrawalRequestId 0x011d1b...
```

## Provider commands

### `create-provider`

Creates a [provider](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/provider.md) and returns a provider ID.

**You probably should not be using this.**
Airnode will create your provider during [deployment](https://github.com/api3dao/api3-docs/blob/master/provider-guides/deploying-airnode.md).

```sh
npx @api3/airnode-admin create-provider \
  --chain ropsten \
  --mnemonic "nature about salad..." \
  --providerAdmin 0xc2193d...
```

### `update-provider-admin`

Updates the [provider admin](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/provider.md#provideradmin).
The `mnemonic` you provide here has to belong to the previous provider admin.

```sh
npx @api3/airnode-admin update-provider-admin \
  --chain ropsten \
  --mnemonic "nature about salad..." \
  --providerId 0xe1e0dd... \
  --providerAdmin 0x60558a...
```

### `derive-endpoint-id`

Derives the endpoint ID using the OIS title and the endpoint name using the convention described [here](https://github.com/api3dao/api3-docs/blob/master/guides/configuring-airnode.md#triggers).

```sh
npx @api3/airnode-admin derive-endpoint-id \
  --oisTitle "My OIS title..." \
  --endpointName "My endpoint name..."
```

### `update-authorizers`

Updates the [authorizers](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/authorizer.md) of an [endpoint](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/endpoint.md) belonging to a provider.
The `mnemonic` you provide here has to belong to the provider admin.
See the `/example` directory for an example authorizers file.

```sh
npx @api3/airnode-admin update-authorizers \
  --chain ropsten \
  --mnemonic "nature about salad..." \
  --providerId 0xe1e0dd... \
  --endpointId 0x260558... \
  --authorizersFilePath ./authorizers.json
```
