# Monorepo version: `@api3/admin`

# Stand-alone version: `@api3/airnode-admin`

> A package/CLI tool to interact with the Airnode contracts across chains

Almost all commands require you to provide a `providerUrl` such as `https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID>`, `https://xdai.poanetwork.dev`, etc.
The CLI connects to [AirnodeRrp.sol](https://github.com/api3dao/airnode/blob/master/packages/protocol/contracts/rrp/AirnodeRrp.sol) contract, which address is derived from the current chain.
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

### `derive-sponsor-wallet-address`

Derives the address of the wallet designated by an Airnode for a sponsor, which is called the sponsor wallet. The `airnode-xpub` must belong to the HDNode with the path `m/44'/60'/0'` of the Airnode wallet.

```sh
npx @api3/airnode-admin derive-sponsor-wallet-address \
  --airnode-xpub xpub6CUGRUo... \
  --airnode-address 0xe1e0dd... \
  --sponsor-address 0x9Ec6C4...
```

### `sponsor-requester`

Sponsors a requester contract so that its requests can be fulfilled by the sponsor's wallet.
The account derived from the `mnemonic` you provide here has to belong to the sponsor.

```sh
npx @api3/airnode-admin sponsor-requester \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --mnemonic "nature about salad..." \
  --requester-address 0x2c2e12...
```

### `unsponsor-requester`

Revokes the sponsorship of a requester contract so that its requests can no longer be fulfilled by the sponsor's wallet.
The account derived from the `mnemonic` you provide here has to belong to the sponsor.

```sh
npx @api3/airnode-admin unsponsor-requester \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --mnemonic "nature about salad..." \
  --requester-address 0x2c2e12...
```

### `get-sponsor-status`

Returns the sponsorship status for the given sponsor and requester (`true` if sponsored, `false` otherwise).

```sh
npx @api3/airnode-admin get-sponsor-status \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --sponsor-address 0x9Ec6C4... \
  --requester-address 0x2c2e12...
```

### `create-template`

Reads a file, uses its contents to create a template and returns the template ID.
See the `/example` directory for an example template file.

```sh
npx @api3/airnode-admin create-template \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --mnemonic "nature about salad..." \
  --template-file-path ./template.json
```

### `get-template`

Returns the template for the given `templateId`.

```sh
npx @api3/airnode-admin get-template \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --template-id 0x8d3b9...
```

### `request-withdrawal`

Requests a withdrawal from the wallet designated by an Airnode for a sponsor, and returns the request ID.
The account derived from the `mnemonic` you provide here has to belong to the sponsor.

```sh
npx @api3/airnode-admin request-withdrawal \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --mnemonic "nature about salad..." \
  --airnode-address 0xe1e0dd... \
  --sponsor-wallet-address 0x9Ec6C4... \
```

### `check-withdrawal-request`

Checks the status of the withdrawal request with the given ID.

```sh
npx @api3/airnode-admin check-withdrawal-request \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --withdrawal-request-id 0x011d1b...
```

## Airnode commands

### `derive-endpoint-id`

Derives the endpoint ID using the OIS title and the endpoint name.

```sh
npx @api3/airnode-admin derive-endpoint-id \
  --ois-title "My OIS title..." \
  --endpoint-name "My endpoint name..."
```

## AirnodeRequesterRrpAuthorizer commands

### `set-whitelist-expiration`

Called by a super admin to set the whitelisting expiration of a user for the Airnode–endpoint pair

```sh
npx @api3/airnode-admin set-whitelist-expiration \
  --mnemonic "nature about salad..." \
  --derivation-path "m/44'/60'/0'/0/..." \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --airnode-requester-rrp-authorizer 0xDc64a1... \
  --endpoint-id 0xda088e2d94... \
  --user-address 0x2c2e12... \
  --expiration-timestamp 1947451793 \
  --airnode-address 0xe1e0dd... \
```

### `extend-whitelist-expiration`

Called by an admin to extend the whitelist expiration of a user for the Airnode–endpoint pair

```sh
npx @api3/airnode-admin extend-whitelist-expiration \
  --mnemonic "nature about salad..." \
  --derivation-path "m/44'/60'/0'/0/..." \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --airnode-requester-rrp-authorizer 0xDc64a1... \
  --endpoint-id 0xda088e2d94... \
  --user-address 0x2c2e12... \
  --expiration-timestamp 1947451793 \
  --airnode-address 0xe1e0dd... \
```

### `set-whitelist-status-past-expiration`

Called by a super admin to set the whitelist status of a user past expiration for the Airnode–endpoint pair

```sh
npx @api3/airnode-admin set-whitelist-status-past-expiration \
  --mnemonic "nature about salad..." \
  --derivation-path "m/44'/60'/0'/0/..." \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --airnode-requester-rrp-authorizer 0xDc64a1... \
  --endpoint-id 0xda088e2d94... \
  --user-address 0x2c2e12... \
  --whitelist-status-past-expiration true \
  --airnode-address 0xe1e0dd... \
```

### `get-whitelist-status`

Called to get the detailed whitelist status of a user for the Airnode–endpoint pair

```sh
npx @api3/airnode-admin get-whitelist-status \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --airnode-requester-rrp-authorizer 0xDc64a1... \
  --endpoint-id 0xda088e2d94... \
  --user-address 0x2c2e12... \
  --airnode-address 0xe1e0dd... \
```

### `user-is-whitelisted`

Called to check if a user is whitelisted to use the Airnode–endpoint pair

```sh
npx @api3/airnode-admin user-is-whitelisted \
  --provider-url https://eth-rinkeby.gateway.pokt.network/v1/lb/<APP_ID> \
  --airnode-requester-rrp-authorizer 0xDc64a1... \
  --endpoint-id 0xda088e2d94... \
  --user-address 0x2c2e12... \
  --airnode-address 0xe1e0dd... \
```

## More examples

You can find more examples in the test files.
