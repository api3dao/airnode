# Monorepo version: `@airnode/admin`
# Stand-alone version: `@api3/airnode-admin`

> A package/CLI tool to interact with the Airnode contracts across chains

> This README is in sync with the master branch. You can find the **pre-alpha** documentation [here](https://github.com/api3dao/airnode/blob/pre-alpha/packages/admin/README.md).

Almost all commands require you to provide a `providerUrl` such as `https://ropsten.infura.io/v3/<KEY>`, `https://xdai.poanetwork.dev`, etc.
Currently supported chains are:
- Ropsten
- Rinkeby
- Goerli
- xDai
- Fantom
- Other (custom) chains - if you provide optional `airnodeRrp` command argument with address of the deployed [AirnodeRrp.sol](https://github.com/api3dao/airnode/blob/master/packages/protocol/contracts/AirnodeRrp.sol) contract on your targeted chain.

Commands that require `mnemonic` will make an on-chain transaction.
The application will derive the account from the mnemonic with default ethereum derivation path `m/44'/60'/0'/0/0`, but you can override this by `derivationPath` flag.
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

## SDK

You can also use the package programatically. The SDK exports respective functions for all CLI commands as
well as helper functions for obtaining the contract instance on the targeted chain.

```js
import { createRequester, getAirnodeRrpWithSigner } from '@airnode/admin';

// First obtain the contract instance on target chain
const airnodeRrp = await getAirnodeRrpWithSigner(mnemonic, derivationPath, providerUrl, airnodeRrpAddress);
// Pass the contract instance as the first argument the the SDK function
const requesterIndex = await createRequester(airnodeRrp, requesterAdmin);
```

If you plan to use multiple commands it might be tedious to pass the contract instance to every function call. For this reason there is also class based `AdminSdk` which you initialize with `AirnodeRrp` contract only once.

```js
import { AdminSdk } from '@airnode/admin';

// First initialize the SDK with AirnodeRrp contract instance.
// You can use static AdminSdk functions or provide your own instance.
const airnodeRrp = await AdminSdk.getAirnodeRrpWithSigner(mnemonic, derivationPath, providerUrl, airnodeRrpAddress);
// Create sdk instance
const adminSdk = new AdminSdk(airnodeRrp);
// Call the method you need
const requesterIndex = await adminSdk.createRequester(requesterAdmin);

// You can switch the contract instance anytime. E.g. if you are using ethers
adminSdk.airnodeRrp = airnodeRrp.connect(someOtherWallet);
```

The SDK will also provide TS typings out of the box.
Please, refer to the implementation for more details.

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
The account derived from the `mnemonic` you provide here has to belong to the previous requester admin.

```sh
npx @api3/airnode-admin set-requester-admin \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --derivationPath "m/44'/60'/0'/0/2" \
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
The account derived from the `mnemonic` you provide here has to belong to the requester admin.

```sh
npx @api3/airnode-admin endorse-client \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requesterIndex 6 \
  --clientAddress 0x2c2e12...
```

### `unendorse-client`

Unendorses a client contract so that its requests can no longer be fulfilled by the requester's designated wallet.
The account derived from the `mnemonic` you provide here has to belong to the requester admin.

```sh
npx @api3/airnode-admin unendorse-client \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requesterIndex 6 \
  --clientAddress 0x2c2e12...
```

### `get-endorsement-status`

Returns the endorsment status for the given requesterIndex and client. Returns true if endorsed, false otherwise.

```sh
npx @api3/airnode-admin get-endorsement-status \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --requesterIndex 6 \
  --clientAddress 0x2c2e12...
```

### `client-address-to-no-requests`

Returns the number of requests made by the client.

```sh
npx @api3/airnode-admin client-address-to-no-requests \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
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

### `get-template`

Returns the template for the given templateId.

```sh
npx @api3/airnode-admin get-template \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --templateId 0x8d3b9...
```

### `get-templates`

Returns the templates for the given templateIds. Template IDs need to be separated by space.

```sh
npx @api3/airnode-admin get-templates \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --templateIds 0x8d3b9... 0x54c63...
```

### `request-withdrawal`

Requests a [withdrawal](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/designated-wallet.md#withdrawals) from the wallet designated by an Airnode for a requester, and returns the request ID.
The account derived from the `mnemonic` you provide here has to belong to the requester admin.

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

### `fulfill-withdrawal`

Checks the status of the withdrawal request with the given ID.
The `airnodeMnemonic` must be the airnode mnemonic for which you requested withdrawal.
The amount to be withdrawn is in ETH (e.g. specifying "1.2" will withdraw 1.2 ETH).

```sh
npx @api3/airnode-admin fulfill-withdrawal \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --airnodeMnemonic "deal hold waste..." \
  --airnodeId 0xe1e0dd... \
  --requesterIndex 6 \
  --withdrawalRequestId 0x011d1b...
  --destination 0x98aaba...
  --amount 1.2
```

### `count-withdrawal-requests`

Returns the number of withdrawal requests for the given requesterIndex.

```sh
npx @api3/airnode-admin count-withdrawal-requests \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --requesterIndex 0x011d1b...
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

### `get-airnode-parameters`

Returns the airnode parameters and block number for the given airnodeId.

```sh
npx @api3/airnode-admin get-airnode-parameters \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --airnodeId 0xe1e0dd...
```

### `derive-endpoint-id`

Derives the endpoint ID using the OIS title and the endpoint name using the convention described [here](https://github.com/api3dao/api3-docs/blob/master/provider-guides/configuring-airnode.md#triggers).

```sh
npx @api3/airnode-admin derive-endpoint-id \
  --oisTitle "My OIS title..." \
  --endpointName "My endpoint name..."
```

## More examples

You can find more examples in the test files.
