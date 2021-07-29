# Monorepo version: `@api3/admin`

# Stand-alone version: `@api3/airnode-admin`

> A package/CLI tool to interact with the Airnode contracts across chains

Almost all commands require you to provide a `providerUrl` such as `https://ropsten.infura.io/v3/<KEY>`, `https://xdai.poanetwork.dev`, etc.
The CLI connects to [AirnodeRrp.sol](https://github.com/api3dao/airnode/blob/master/packages/protocol/contracts/AirnodeRrp.sol) contract, which address is derived from the current chain.
You can optionally specify the contract address yourself by providing optional `airnodeRrp` command argument with address of the deployed contract on your targeted chain.

Commands that require `mnemonic` will make an on-chain transaction (with the exception of `derive-sponsor-wallet`).
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
import { endorseRequester, getAirnodeRrpWithSigner } from '@api3/admin';

// First obtain the contract instance on target chain
const airnodeRrp = await getAirnodeRrpWithSigner(mnemonic, derivationPath, providerUrl, airnodeRrpAddress);
// Pass the contract instance as the first argument to the SDK function
const requester = await endorseRequester(airnodeRrp, requester);
```

If you plan to use multiple commands it might be tedious to pass the contract instance to every function call. For this reason there is also class based `AdminSdk` which you initialize with `AirnodeRrp` contract only once.

```js
import { AdminSdk } from '@api3/admin';

// First initialize the SDK with AirnodeRrp contract instance.
// You can use static AdminSdk functions or provide your own instance.
const airnodeRrp = await AdminSdk.getAirnodeRrpWithSigner(mnemonic, derivationPath, providerUrl, airnodeRrpAddress);
// Create sdk instance
const adminSdk = new AdminSdk(airnodeRrp);
// Call the method you need
const requester = await adminSdk.endorseRequester(requester);

// You can switch the contract instance anytime. E.g. if you are using ethers
adminSdk.airnodeRrp = airnodeRrp.connect(someOtherWallet);
```

The SDK will also provide TS typings out of the box.
Please, refer to the implementation for more details.

## Requester commands

### `derive-sponsor-wallet`

Derives the address of the [wallet designated by an Airnode for a requester](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/designated-wallet.md).

```sh
npx @api3/airnode-admin derive-sponsor-wallet \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --sponsor 0x9Ec6C4...
```

### `endorse-requester`

[Endorses](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/endorsement.md) a requester contract so that its requests can be fulfilled by the sponsor's designated wallet.
The account derived from the `mnemonic` you provide here has to belong to the sponsor.

```sh
npx @api3/airnode-admin endorse-requester \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requester 0x2c2e12...
```

### `unendorse-requester`

Unendorses a requester contract so that its requests can no longer be fulfilled by the sponsor's designated wallet.
The account derived from the `mnemonic` you provide here has to belong to the sponsor.

```sh
npx @api3/airnode-admin unendorse-requester \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requester 0x2c2e12...
```

### `get-endorsement-status`

Returns the endorsement status for the given sponsor and requester (`true` if endorsed, `false` otherwise).

```sh
npx @api3/airnode-admin get-endorsement-status \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --sponsor 0x9Ec6C4... \
  --requester 0x2c2e12...
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

Returns the template for the given `templateId`.

```sh
npx @api3/airnode-admin get-template \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --templateId 0x8d3b9...
```

### `request-withdrawal`

Requests a [withdrawal](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/designated-wallet.md#withdrawals) from the wallet designated by an Airnode for a sponsor, and returns the request ID.
The account derived from the `mnemonic` you provide here has to belong to the sponsor.

```sh
npx @api3/airnode-admin request-withdrawal \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --airnode 0xe1e0dd... \
  --sponsorWallet 0x9Ec6C4... \
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

### `set-airnode-xpub`

Sets the xpub of an [Airnode](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/provider.md).

**This extended public key does not need to be announced on-chain for the protocol to be used, it is mainly for convenience.**

```sh
npx @api3/airnode-admin set-airnode-parameters \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --authorizersFilePath ./authorizers.json
```

The account derived from the `mnemonic` you provide here has to belong to the airnode.

### `get-airnode-xpub`

Returns the Airnode xpub for the given `airnode`.

```sh
npx @api3/airnode-admin get-airnode-xpub \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --airnode 0xe1e0dd...
```

### `set-airnode-authorizers`

Sets the authorizers of an [Airnode](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/provider.md).
See the `/example` directory for an example authorizers file.

**These authorizer contract addresses do not need to be announced on-chain for the protocol to be used, it is mainly for convenience.**

```sh
npx @api3/airnode-admin set-airnode-authorizers \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --authorizersFilePath ./authorizers.json
```

The account derived from the mnemonic you provide here has to belong to the airnode.

### `get-airnode-authorizers`

Returns the Airnode authorizers for the given `airnode`.

```sh
npx @api3/airnode-admin get-airnode-authorizers \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --airnode 0xe1e0dd...
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
