# Monorepo version: `@api3/admin`

# Stand-alone version: `@api3/airnode-admin`

> A package/CLI tool to interact with the Airnode contracts across chains

Almost all commands require you to provide a `providerUrl` such as `https://ropsten.infura.io/v3/<KEY>`, `https://xdai.poanetwork.dev`, etc.
The CLI connects to [AirnodeRrp.sol](https://github.com/api3dao/airnode/blob/master/packages/protocol/contracts/AirnodeRrp.sol) contract, which address is derived from the current chain.
You can optionally specify the contract address yourself by providing optional `airnodeRrp` command argument with address of the deployed contract on your targeted chain.

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
import { sponsorRequester, getAirnodeRrpWithSigner } from '@api3/admin';

// First obtain the contract instance on target chain
const airnodeRrp = await getAirnodeRrpWithSigner(mnemonic, derivationPath, providerUrl, airnodeRrpAddress);
// Pass the contract instance as the first argument to the SDK function
const requester = await sponsorRequester(airnodeRrp, requester);
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
const requester = await adminSdk.sponsorRequester(requester);

// You can switch the contract instance anytime. E.g. if you are using ethers
adminSdk.airnodeRrp = airnodeRrp.connect(someOtherWallet);
```

The SDK will also provide TS typings out of the box.
Please, refer to the implementation for more details.

## Developer commands

### `derive-sponsor-wallet`

Derives the address of the wallet designated by an Airnode for a requester.

```sh
npx @api3/airnode-admin derive-sponsor-wallet \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --sponsor 0x9Ec6C4...
```

### `sponsor-requester`

Sponsors a requester contract so that its requests can be fulfilled by the sponsor's wallet.
The account derived from the `mnemonic` you provide here has to belong to the sponsor.

```sh
npx @api3/airnode-admin sponsor-requester \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requester 0x2c2e12...
```

### `unsponsor-requester`

Revokes the sponsorship of a requester contract so that its requests can no longer be fulfilled by the sponsor's wallet.
The account derived from the `mnemonic` you provide here has to belong to the sponsor.

```sh
npx @api3/airnode-admin unsponsor-requester \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --requester 0x2c2e12...
```

### `get-sponsor-status`

Returns the sponsorship status for the given sponsor and requester (`true` if sponsored, `false` otherwise).

```sh
npx @api3/airnode-admin get-sponsor-status \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --sponsor 0x9Ec6C4... \
  --requester 0x2c2e12...
```

### `create-template`

Reads a file, uses its contents to create a template and returns the template ID.
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

Requests a withdrawal from the wallet designated by an Airnode for a sponsor, and returns the request ID.
The account derived from the `mnemonic` you provide here has to belong to the sponsor.

```sh
npx @api3/airnode-admin request-withdrawal \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
  --airnode 0xe1e0dd... \
  --sponsorWallet 0x9Ec6C4... \
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

Sets the xpub of an Airnode.

**This extended public key does not need to be announced on-chain for the protocol to be used, it is mainly for convenience.**

```sh
npx @api3/airnode-admin set-airnode-xpub \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --mnemonic "nature about salad..." \
```

The account derived from the `mnemonic` you provide here has to belong to the airnode.

### `get-airnode-xpub`

Returns the Airnode xpub for the given `airnode`.

```sh
npx @api3/airnode-admin get-airnode-xpub \
  --providerUrl https://ropsten.infura.io/v3/<KEY> \
  --airnode 0xe1e0dd...
```

### `derive-endpoint-id`

Derives the endpoint ID using the OIS title and the endpoint name.

```sh
npx @api3/airnode-admin derive-endpoint-id \
  --oisTitle "My OIS title..." \
  --endpointName "My endpoint name..."
```

## More examples

You can find more examples in the test files.
