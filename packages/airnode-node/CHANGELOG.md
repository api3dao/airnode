# @api3/airnode-node

## 0.9.0

### Minor Changes

- 488a717e: Bump @api3/ois to 1.1.2 with necessary zod version bump
- 6327dd7d: Bump @api3/ois to 1.2.0 with necessary zod version bump
- aa773543: Remove references to deprecated ethereum testnets

### Patch Changes

- 29f144b6: Remove unnecessary async/await, enforce it via eslint
- Updated dependencies [aaa6db11]
- Updated dependencies [3ddaf16b]
- Updated dependencies [4b3db2be]
- Updated dependencies [488a717e]
- Updated dependencies [6327dd7d]
- Updated dependencies [aa773543]
- Updated dependencies [29f144b6]
  - @api3/airnode-protocol@0.9.0
  - @api3/airnode-validator@0.9.0
  - @api3/airnode-adapter@0.9.0
  - @api3/airnode-utilities@0.9.0
  - @api3/airnode-abi@0.9.0

## 0.8.0

### Minor Changes

- 08fc5aa2: Define protocol indices in airnode-protocol
- 87ff06e3: Unify error handling of AWS and GCP gateways
- 19349611: Update logger options to be set at the start of a handler invocation instead of each logger call
- aac8fab3: Support HTTP gateways with airnode-client
- f7c3bb9f: Replace attempt library retries with promise-utils
- c4e33ea7: Add per-endpoint rrp response caching via new (required) `cacheResponses` flag in triggers.rrp[n] of config.json.
- b799a215: Add authorizations configuration to config.json
- 85da1624: Replace gas prices with gas oracle strategies
- 28d1d81b: Merge meta and additional fields of logger
- c7d689e7: Add authorizer type to config.json
- 192156fd: Rework building of Docker images
- 115c13db: Use @api3/ois package and remove @api3/airnode-ois
- d2b588e8: Derive Airnode wallet private key during deployment, add it to environment variables, use private key to derive Airnode wallet
- e34bfb8e: Link monorepo packages using project references

### Patch Changes

- d63e89a0: Use config chainId instead of the chainId from event logs
- 45198315: Add networks mapping to airnode-protocol references.json
- eade375b: callApi handler argument refactor
- a56c4605: Fix airnode-client httpGatewayPath by removing extra `/`
- af3abb0d: Export functions in /api directory
- fe0c102b: Properly handle error when doing sequential request submit
- 69dfe2ac: Improve Airnode logs for callStatic errors by including error message
- Updated dependencies [08fc5aa2]
- Updated dependencies [87ff06e3]
- Updated dependencies [8abc3d4e]
- Updated dependencies [19349611]
- Updated dependencies [c2c2281e]
- Updated dependencies [aac8fab3]
- Updated dependencies [eedbba54]
- Updated dependencies [f7c3bb9f]
- Updated dependencies [45198315]
- Updated dependencies [c4e33ea7]
- Updated dependencies [b799a215]
- Updated dependencies [85da1624]
- Updated dependencies [ffba0579]
- Updated dependencies [eade375b]
- Updated dependencies [d7ca4af8]
- Updated dependencies [28d1d81b]
- Updated dependencies [c7d689e7]
- Updated dependencies [115c13db]
- Updated dependencies [0f68d678]
- Updated dependencies [e34bfb8e]
- Updated dependencies [11d49f21]
- Updated dependencies [55022c55]
  - @api3/airnode-protocol@0.8.0
  - @api3/airnode-validator@0.8.0
  - @api3/airnode-utilities@0.8.0
  - @api3/airnode-adapter@0.8.0
  - @api3/airnode-abi@0.8.0

## 0.7.1

### Patch Changes

- [`2c7fa21b`](https://github.com/api3dao/airnode/commit/2c7fa21b68c3c36bc2b6d4c66b5f7afffc337555) Thanks [@aquarat](https://github.com/aquarat)! - Bump patch version

- Updated dependencies [[`2c7fa21b`](https://github.com/api3dao/airnode/commit/2c7fa21b68c3c36bc2b6d4c66b5f7afffc337555)]:
  - @api3/airnode-abi@0.7.1
  - @api3/airnode-adapter@0.7.1
  - @api3/airnode-ois@0.7.1
  - @api3/airnode-protocol@0.7.1
  - @api3/airnode-utilities@0.7.1
  - @api3/airnode-validator@0.7.1

## 0.7.0

### Minor Changes

- [#1043](https://github.com/api3dao/airnode/pull/1043) [`71f9a95e`](https://github.com/api3dao/airnode/commit/71f9a95e1f93fb2575fd6393795263b96cad4f40) Thanks [@vponline](https://github.com/vponline)! - Add gasPriceMultiplier config for legacy gas prices

* [#1025](https://github.com/api3dao/airnode/pull/1025) [`1c41ae78`](https://github.com/api3dao/airnode/commit/1c41ae78a1db8976730f28f8231b62bd1b4e883c) Thanks [@aquarat](https://github.com/aquarat)! - Enhance config defined pre and post processing

- [#1008](https://github.com/api3dao/airnode/pull/1008) [`f6e6c15b`](https://github.com/api3dao/airnode/commit/f6e6c15be081938e4c6c10fd56bd3ee928457d6f) Thanks [@aquarat](https://github.com/aquarat)! - Add config.json based pre and post-processing

* [#1140](https://github.com/api3dao/airnode/pull/1140) [`b0771eb7`](https://github.com/api3dao/airnode/commit/b0771eb73b49a1f520ecd86aa254c0d3b2f8f5a2) Thanks [@amarthadan](https://github.com/amarthadan)! - Use zod generated schema TS types instead of custom ones

- [#1159](https://github.com/api3dao/airnode/pull/1159) [`260faa11`](https://github.com/api3dao/airnode/commit/260faa1104ee5170c8a884ddde02702b83cb6a85) Thanks [@Siegrift](https://github.com/Siegrift)! - Use default endpoint values, improve validation

* [#1052](https://github.com/api3dao/airnode/pull/1052) [`0561f407`](https://github.com/api3dao/airnode/commit/0561f407dc379ed10bb2ed6ef7eaf064a5a1c09a) Thanks [@Siegrift](https://github.com/Siegrift)! - Enforce node version in validator

- [#1027](https://github.com/api3dao/airnode/pull/1027) [`ab28450d`](https://github.com/api3dao/airnode/commit/ab28450da32a97c4a0c903e55ab41d3bd52b5a7d) Thanks [@vponline](https://github.com/vponline)! - Add request sorting by logIndex

* [#871](https://github.com/api3dao/airnode/pull/871) [`88d6c6d2`](https://github.com/api3dao/airnode/commit/88d6c6d2c2476640faf5aac4cf7edd9f73107bf9) Thanks [@Siegrift](https://github.com/Siegrift)! - Rework ApiCallSuccessResponse type

- [#1089](https://github.com/api3dao/airnode/pull/1089) [`70dafa57`](https://github.com/api3dao/airnode/commit/70dafa575bc33c90823c0de83ea51c7d50788c9e) Thanks [@Siegrift](https://github.com/Siegrift)! - Support TS project references

* [#1127](https://github.com/api3dao/airnode/pull/1127) [`f3bcd689`](https://github.com/api3dao/airnode/commit/f3bcd6890cbf4d2687b0df8b91afe446f212332b) Thanks [@dcroote](https://github.com/dcroote)! - Remove unused tx constants from airnode-node as they have been relocated to airnode-utilities and promise-utils

- [#1075](https://github.com/api3dao/airnode/pull/1075) [`88507a9a`](https://github.com/api3dao/airnode/commit/88507a9ad4682d66800cd866ee298fb64ea4bb7f) Thanks [@dcroote](https://github.com/dcroote)! - Fix type of submitted transactions i.e. submit transactions with legacy pricing as legacy type

* [#1101](https://github.com/api3dao/airnode/pull/1101) [`d1165d86`](https://github.com/api3dao/airnode/commit/d1165d8631bfc1e81955031a9ed2c54d705e1e89) Thanks [@vponline](https://github.com/vponline)! - Add support for templates in config.json and skip fetching valid templates from chain

- [`415a2248`](https://github.com/api3dao/airnode/commit/415a224816bf6edf4ee8a8d6cae60d6e3302c161) Thanks [@aquarat](https://github.com/aquarat)! - Bump minor version for all packages

* [#1048](https://github.com/api3dao/airnode/pull/1048) [`499726e0`](https://github.com/api3dao/airnode/commit/499726e0420ff6356ff1a937a8d77c0e605ced5f) Thanks [@Siegrift](https://github.com/Siegrift)! - Remove skipValidation parameter from config.json

- [#1139](https://github.com/api3dao/airnode/pull/1139) [`80f9b3bc`](https://github.com/api3dao/airnode/commit/80f9b3bc2f9c405749ddee6f5448e4e88494e1b5) Thanks @dependabot! - Update node versions in docker images and monorepo

* [#1143](https://github.com/api3dao/airnode/pull/1143) [`bce3600f`](https://github.com/api3dao/airnode/commit/bce3600feb5febf075987b357f0c788c29fbaf3b) Thanks [@Siegrift](https://github.com/Siegrift)! - Allow setTimeout/setInterval and escaping interpolation in processing snippets

- [#1105](https://github.com/api3dao/airnode/pull/1105) [`e4c1a223`](https://github.com/api3dao/airnode/commit/e4c1a22384d811a796b20c7757b5168bdc6c339d) Thanks [@amarthadan](https://github.com/amarthadan)! - Add config validation for local Airnode invocation including airnode-client container

* [#1131](https://github.com/api3dao/airnode/pull/1131) [`bd4becb6`](https://github.com/api3dao/airnode/commit/bd4becb68ba334958b598f5a56e0e31278b0a71d) Thanks [@dcroote](https://github.com/dcroote)! - Introduces an optional `withdrawalRemainder` within chain `options` of `config.json` that gets subtracted from the funds returned to the sponsor when making a withdrawal.

### Patch Changes

- [#1158](https://github.com/api3dao/airnode/pull/1158) [`e42aa310`](https://github.com/api3dao/airnode/commit/e42aa3101d35f7968443ed166f57ae653e754095) Thanks [@Siegrift](https://github.com/Siegrift)! - Improve TS project references structure, fix published files for airnode-examples

* [#1073](https://github.com/api3dao/airnode/pull/1073) [`b0f6dadd`](https://github.com/api3dao/airnode/commit/b0f6dadd8f2a991d363400abea3b79c202aff103) Thanks [@vponline](https://github.com/vponline)! - Convert gasPriceMultiplier to BigNumber

- [#1117](https://github.com/api3dao/airnode/pull/1117) [`c75057a9`](https://github.com/api3dao/airnode/commit/c75057a962983ba11ea6e92e778c4fae2e887c28) Thanks [@aquarat](https://github.com/aquarat)! - Fix missing axios dependency in airnode-node package

* [#1037](https://github.com/api3dao/airnode/pull/1037) [`3db6106a`](https://github.com/api3dao/airnode/commit/3db6106a66c463be1c707b51f42ad7ccf87fdd2a) Thanks [@vponline](https://github.com/vponline)! - Remove airnode address from templateId verification

- [#1174](https://github.com/api3dao/airnode/pull/1174) [`6bc6f82a`](https://github.com/api3dao/airnode/commit/6bc6f82a321e201135bfa0ac11428cd742a82470) Thanks [@amarthadan](https://github.com/amarthadan)! - Allow empty `chains` array in the config

- Updated dependencies [[`71f9a95e`](https://github.com/api3dao/airnode/commit/71f9a95e1f93fb2575fd6393795263b96cad4f40), [`46858ba8`](https://github.com/api3dao/airnode/commit/46858ba817b665ab6adc6e5be2a7808ab4ab1e6d), [`e42aa310`](https://github.com/api3dao/airnode/commit/e42aa3101d35f7968443ed166f57ae653e754095), [`1c41ae78`](https://github.com/api3dao/airnode/commit/1c41ae78a1db8976730f28f8231b62bd1b4e883c), [`bff29ae5`](https://github.com/api3dao/airnode/commit/bff29ae55cf366926731db50ca923238dc9b0ad2), [`a0d02552`](https://github.com/api3dao/airnode/commit/a0d025524b84a599f0ab7c4387d7a2aca02f2335), [`1efa53b8`](https://github.com/api3dao/airnode/commit/1efa53b87d3067fc9fc4982d6d6d22630dc81180), [`f6e6c15b`](https://github.com/api3dao/airnode/commit/f6e6c15be081938e4c6c10fd56bd3ee928457d6f), [`4aadb2ce`](https://github.com/api3dao/airnode/commit/4aadb2ce42383940ba157159215d6044720122c3), [`f55541df`](https://github.com/api3dao/airnode/commit/f55541df7aca833b06ce07f641f33b85345f66f6), [`33f9e298`](https://github.com/api3dao/airnode/commit/33f9e298d487845eaf0a43ab788b6259c6112544), [`8b455834`](https://github.com/api3dao/airnode/commit/8b455834f13788a9d76def4babb2c55cd6066472), [`09d01d0b`](https://github.com/api3dao/airnode/commit/09d01d0bcc8856eab6ecd60b0ca59a0119a71468), [`b0771eb7`](https://github.com/api3dao/airnode/commit/b0771eb73b49a1f520ecd86aa254c0d3b2f8f5a2), [`b0f6dadd`](https://github.com/api3dao/airnode/commit/b0f6dadd8f2a991d363400abea3b79c202aff103), [`260faa11`](https://github.com/api3dao/airnode/commit/260faa1104ee5170c8a884ddde02702b83cb6a85), [`0561f407`](https://github.com/api3dao/airnode/commit/0561f407dc379ed10bb2ed6ef7eaf064a5a1c09a), [`9175f5c3`](https://github.com/api3dao/airnode/commit/9175f5c3ce47c778b29579f6315a58fd925473c4), [`dc235126`](https://github.com/api3dao/airnode/commit/dc235126c744da1fc1df06ae0381cf7efe3842b1), [`d5c9dde6`](https://github.com/api3dao/airnode/commit/d5c9dde6cd1c5ff25e05014ea05573c297350be0), [`4de2b8ef`](https://github.com/api3dao/airnode/commit/4de2b8efc2bbeec5c35e02c6e99b7b980f47e4d4), [`9cb94bc0`](https://github.com/api3dao/airnode/commit/9cb94bc0bffb3c99e16e8060b63cf753c669924f), [`c3b7eee7`](https://github.com/api3dao/airnode/commit/c3b7eee7c9cc7efbfb418e954109c9587df7fc3d), [`0c3d0d6d`](https://github.com/api3dao/airnode/commit/0c3d0d6d07532989cac2f54919861c4cd3f98d0f), [`70dafa57`](https://github.com/api3dao/airnode/commit/70dafa575bc33c90823c0de83ea51c7d50788c9e), [`a1b3200e`](https://github.com/api3dao/airnode/commit/a1b3200e12875e8151578a58347562fc643fb5fe), [`f3bcd689`](https://github.com/api3dao/airnode/commit/f3bcd6890cbf4d2687b0df8b91afe446f212332b), [`6427dc79`](https://github.com/api3dao/airnode/commit/6427dc797bef286ae9ea2d2cf1a3d01b315e143f), [`88507a9a`](https://github.com/api3dao/airnode/commit/88507a9ad4682d66800cd866ee298fb64ea4bb7f), [`982803f7`](https://github.com/api3dao/airnode/commit/982803f74af8a4de78390bc9a2881ba889257d8e), [`c4873921`](https://github.com/api3dao/airnode/commit/c4873921949a29afcd0b5a85c33b615779845325), [`6e76a776`](https://github.com/api3dao/airnode/commit/6e76a77653a55c6f7f3d7f1a6d246589efb387c1), [`d1165d86`](https://github.com/api3dao/airnode/commit/d1165d8631bfc1e81955031a9ed2c54d705e1e89), [`415a2248`](https://github.com/api3dao/airnode/commit/415a224816bf6edf4ee8a8d6cae60d6e3302c161), [`499726e0`](https://github.com/api3dao/airnode/commit/499726e0420ff6356ff1a937a8d77c0e605ced5f), [`8a0dab13`](https://github.com/api3dao/airnode/commit/8a0dab138ead814df09e45ddb3bbf9166fda5b67), [`bce3600f`](https://github.com/api3dao/airnode/commit/bce3600feb5febf075987b357f0c788c29fbaf3b), [`85057269`](https://github.com/api3dao/airnode/commit/85057269083f4ba2e5ca6416602891952b80c61f), [`39b3a946`](https://github.com/api3dao/airnode/commit/39b3a9469dd8bc8fea06aece573a83a9df821d7a), [`bd4becb6`](https://github.com/api3dao/airnode/commit/bd4becb68ba334958b598f5a56e0e31278b0a71d), [`d90a4d70`](https://github.com/api3dao/airnode/commit/d90a4d70f90c9d6798cac71da2cd8cdf20190b67)]:
  - @api3/airnode-utilities@0.7.0
  - @api3/airnode-validator@0.7.0
  - @api3/airnode-abi@0.7.0
  - @api3/airnode-adapter@0.7.0
  - @api3/airnode-ois@0.7.0
  - @api3/airnode-protocol@0.7.0

## 0.6.0

### Minor Changes

- [#996](https://github.com/api3dao/airnode/pull/996) [`62a090ed`](https://github.com/api3dao/airnode/commit/62a090eddf37db93ebc64ba10ec70f21199c4dbe) Thanks [@dcroote](https://github.com/dcroote)! - Refactor AggregatedApiCall interfaces according to their necessary properties

* [#944](https://github.com/api3dao/airnode/pull/944) [`d2c8befd`](https://github.com/api3dao/airnode/commit/d2c8befd9d69e8bb41655fc55da6f03762447bae) Thanks [@vponline](https://github.com/vponline)! - Add `protocolId` as an optional parameter to `deriveWalletPathFromSponsorAddress`, add `deriveSponsorWalletFromMnemonic` and move `loadConfig` and `loadTrustedConfig` to airnode-node

- [`048a4c83`](https://github.com/api3dao/airnode/commit/048a4c830151947c4869cde9b6d5a7f67a606c31) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

* [#997](https://github.com/api3dao/airnode/pull/997) [`331a6b9d`](https://github.com/api3dao/airnode/commit/331a6b9dc6579fe922a423901983577e954dc9eb) Thanks [@vponline](https://github.com/vponline)! - Replace API_CALL_FULFILLMENT_GAS_LIMIT constant with fulfillmentGasLimit configuration option

### Patch Changes

- [#1007](https://github.com/api3dao/airnode/pull/1007) [`ee483ce6`](https://github.com/api3dao/airnode/commit/ee483ce6d49466fad7bf983d60069d9226de3c6f) Thanks [@dcroote](https://github.com/dcroote)! - Add deployment phase 2 and 3 networks

* [#957](https://github.com/api3dao/airnode/pull/957) [`636e8b98`](https://github.com/api3dao/airnode/commit/636e8b981c3ae84c151a77686e233de67c572a96) Thanks [@vponline](https://github.com/vponline)! - Change `deriveWalletPathFromSponsorAddress` `protocolId` to have a default value

- [#1010](https://github.com/api3dao/airnode/pull/1010) [`a8fa7373`](https://github.com/api3dao/airnode/commit/a8fa737388460a30e2332996550e0ce44b00bc2a) Thanks [@vponline](https://github.com/vponline)! - Add minConfirmations to transaction count fetching

* [#995](https://github.com/api3dao/airnode/pull/995) [`75dfabf9`](https://github.com/api3dao/airnode/commit/75dfabf95b53e1365792248db418395bab322f19) Thanks [@dcroote](https://github.com/dcroote)! - Fix misleading log in initiateTransactions

* Updated dependencies [[`048a4c83`](https://github.com/api3dao/airnode/commit/048a4c830151947c4869cde9b6d5a7f67a606c31), [`1b8bcb01`](https://github.com/api3dao/airnode/commit/1b8bcb012350f7f1c6ae881067f697d90f59f1f6), [`1d16a73d`](https://github.com/api3dao/airnode/commit/1d16a73ddc357bb79df1311ef10fb78df0be7ccb), [`b5556b26`](https://github.com/api3dao/airnode/commit/b5556b26e2a2baefdbf26fd34045811fca8d2650), [`c1dc6dd5`](https://github.com/api3dao/airnode/commit/c1dc6dd5334cabc782ce0a71deb9be4fcd2b602f), [`331a6b9d`](https://github.com/api3dao/airnode/commit/331a6b9dc6579fe922a423901983577e954dc9eb), [`4c7fbe1a`](https://github.com/api3dao/airnode/commit/4c7fbe1af918a46d766b01d866046a0dd4d80914)]:
  - @api3/airnode-abi@0.6.0
  - @api3/airnode-adapter@0.6.0
  - @api3/airnode-ois@0.6.0
  - @api3/airnode-protocol@0.6.0
  - @api3/airnode-utilities@0.6.0
  - @api3/airnode-validator@0.6.0

## 0.5.0

### Minor Changes

- [#867](https://github.com/api3dao/airnode/pull/867) [`bbc3b519`](https://github.com/api3dao/airnode/commit/bbc3b5195938d570bef4a79ab82c360d9d650970) Thanks [@aquarat](https://github.com/aquarat)! - Refactored console calls to point to an abstracted version of the function in a new package, airnode-utilities

* [#832](https://github.com/api3dao/airnode/pull/832) [`44de4f10`](https://github.com/api3dao/airnode/commit/44de4f1045b7fb126e1effab48fdc54e17e50e5e) Thanks [@amarthadan](https://github.com/amarthadan)! - Remove `callApi` call from `testApi` handler

- [#930](https://github.com/api3dao/airnode/pull/930) [`2a65d970`](https://github.com/api3dao/airnode/commit/2a65d970f6781290f5d861a2c3210f402b2cc2af) Thanks [@dcroote](https://github.com/dcroote)! - Remove Fulfilled variant of RequestStatus enum

* [#943](https://github.com/api3dao/airnode/pull/943) [`2f5b1434`](https://github.com/api3dao/airnode/commit/2f5b1434a918f254dcc99d879604fec1eff00754) Thanks [@dcroote](https://github.com/dcroote)! - Remove Errored variant of RequestStatus enum and drop errored requests

- [#933](https://github.com/api3dao/airnode/pull/933) [`6504c3c8`](https://github.com/api3dao/airnode/commit/6504c3c88fa39026f0392f0892ab6adc85115461) Thanks [@vponline](https://github.com/vponline)! - Move gas-prices implementation to airnode-utilities

* [`2accfc98`](https://github.com/api3dao/airnode/commit/2accfc98470f72f8463a4e80b01150ff4a0b2312) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

- [#820](https://github.com/api3dao/airnode/pull/820) [`0ec9b739`](https://github.com/api3dao/airnode/commit/0ec9b739b5d56f7efcbf61d7c144d1ca322733f1) Thanks [@amarthadan](https://github.com/amarthadan)! - Maximal concurrency of serverless functions is set based on the chain settings (maxConcurrency field)
  Add option to disable concurrency reservations for all serverless functions

* [#832](https://github.com/api3dao/airnode/pull/832) [`702b6a97`](https://github.com/api3dao/airnode/commit/702b6a97a07c86f93d5906e887874a96ae743586) Thanks [@amarthadan](https://github.com/amarthadan)! - Add option to set maximum concurrency for HTTP gateway

- [#873](https://github.com/api3dao/airnode/pull/873) [`7dbee809`](https://github.com/api3dao/airnode/commit/7dbee809ee68fb8cd21f22892e32bd0258f231fd) Thanks [@Ashar2shahid](https://github.com/Ashar2shahid)! - use minConfirmations when fetching blocks

* [#951](https://github.com/api3dao/airnode/pull/951) [`0ed6277b`](https://github.com/api3dao/airnode/commit/0ed6277bdd789bfa48d97e6c5d179c9ba357a520) Thanks [@dcroote](https://github.com/dcroote)! - Remove RequestStatus enum and remove ignoreBlockedRequestsAfterBlocks from request metadata. Requests that were previously assigned a status like blocked, errored, or fulfilled are now dropped.

- [#829](https://github.com/api3dao/airnode/pull/829) [`0cada555`](https://github.com/api3dao/airnode/commit/0cada555a0212d9d593458b2aa18ead668299b5b) Thanks [@Siegrift](https://github.com/Siegrift)! - Remove retries and timeout for getLogs

* [#843](https://github.com/api3dao/airnode/pull/843) [`b37845cd`](https://github.com/api3dao/airnode/commit/b37845cde866e6a2e2afb1130c2afe3598779871) Thanks [@amarthadan](https://github.com/amarthadan)! - Add endpoint for getting signed data for beacon updates

- [#874](https://github.com/api3dao/airnode/pull/874) [`11d725dd`](https://github.com/api3dao/airnode/commit/11d725dd3c87d112b45d70086f42c18bea2015b3) Thanks [@dcroote](https://github.com/dcroote)! - Removed Ignored variant of RequestStatus enum, which results in Airnode now dropping pending API calls for a sponsorWallet once a withdrawal is requested

* [#831](https://github.com/api3dao/airnode/pull/831) [`4f177d85`](https://github.com/api3dao/airnode/commit/4f177d856085b42632910e727b65a21f8e13af53) Thanks [@dcroote](https://github.com/dcroote)! - Remove Submitted variant of RequestStatus enum

- [#931](https://github.com/api3dao/airnode/pull/931) [`2c6af19b`](https://github.com/api3dao/airnode/commit/2c6af19bea7f0b2835e5bb826268ecf5abc7b641) Thanks [@amarthadan](https://github.com/amarthadan)! - Send HTTP Signed Data Gateway URL within the heartbeat

* [#835](https://github.com/api3dao/airnode/pull/835) [`b186009f`](https://github.com/api3dao/airnode/commit/b186009f8af3f6e58b874741afc7b622663ddd76) Thanks [@Siegrift](https://github.com/Siegrift)! - Redesign airnode-validator and implement a PoC

- [#832](https://github.com/api3dao/airnode/pull/832) [`6060e8c9`](https://github.com/api3dao/airnode/commit/6060e8c9dbfa357787ed88a006fdbc2e0fa0ae75) Thanks [@amarthadan](https://github.com/amarthadan)! - Serverless functions `initializeProvider`, `callApi` and `processTransations` are replaced with one function called `run`

### Patch Changes

- [#837](https://github.com/api3dao/airnode/pull/837) [`9ab6ea9c`](https://github.com/api3dao/airnode/commit/9ab6ea9c7a5e9d348dd06c6f95efd66aa6061477) Thanks [@vponline](https://github.com/vponline)! - Removes response data from airnode-adapter extraction error message

* [#929](https://github.com/api3dao/airnode/pull/929) [`ff257e86`](https://github.com/api3dao/airnode/commit/ff257e8623929588587b56cb80991b68fc02e812) Thanks [@vponline](https://github.com/vponline)! - Add airnode-node gas prices implementation to airnode-admin

- [#847](https://github.com/api3dao/airnode/pull/847) [`8aa30390`](https://github.com/api3dao/airnode/commit/8aa30390d660efd8c8bd3aa432e05bf2c021b8ba) Thanks [@aquarat](https://github.com/aquarat)! - Support additional testnet chains for airnode-examples

* [#839](https://github.com/api3dao/airnode/pull/839) [`8bd231a7`](https://github.com/api3dao/airnode/commit/8bd231a73e155ea32ec38b4137796d379c8f3399) Thanks [@amarthadan](https://github.com/amarthadan)! - Move heartbeat API key to a request header

- [#848](https://github.com/api3dao/airnode/pull/848) [`8d4fd368`](https://github.com/api3dao/airnode/commit/8d4fd36888213cfb3866f328250946bb4c9f3028) Thanks [@Siegrift](https://github.com/Siegrift)! - Use the same version of dependencies across packages

* [#897](https://github.com/api3dao/airnode/pull/897) [`fb9c57ad`](https://github.com/api3dao/airnode/commit/fb9c57adb8b5e476699103d2a2ef4c1a0a5318bf) Thanks [@aquarat](https://github.com/aquarat)! - Revert of eip1559-related changes

- [#842](https://github.com/api3dao/airnode/pull/842) [`cfe6cafa`](https://github.com/api3dao/airnode/commit/cfe6cafa483aee83eaf16c53df15591f943a56a1) Thanks [@vponline](https://github.com/vponline)! - Refactor `jest.spyOn(fs, 'readFileSync').mockReturnValue` to use `mockImplementation` to fix affected tests

* [#937](https://github.com/api3dao/airnode/pull/937) [`b093eb56`](https://github.com/api3dao/airnode/commit/b093eb5666db11892c5d31bb08366c541ab1d41b) Thanks @dependabot! - Fix tests after ethers version bump

- [#818](https://github.com/api3dao/airnode/pull/818) [`3a94a49c`](https://github.com/api3dao/airnode/commit/3a94a49cbf7e7e620bcf0d8212a5efcfaab066a2) Thanks [@vponline](https://github.com/vponline)! - Add more detailed errors for airnode responses

* [#947](https://github.com/api3dao/airnode/pull/947) [`291f6a45`](https://github.com/api3dao/airnode/commit/291f6a45b2166849608d01bcce0b759978a19843) Thanks @dependabot! - Fix jest test to improve robustness when changing ethers versions

- [#907](https://github.com/api3dao/airnode/pull/907) [`abe6fbd4`](https://github.com/api3dao/airnode/commit/abe6fbd40517d8536d88e8d02889c32d81087902) Thanks [@Ashar2shahid](https://github.com/Ashar2shahid)! - Derive templateId from endpointId and encodedParamters for http signed data requests

* [#851](https://github.com/api3dao/airnode/pull/851) [`59e7802e`](https://github.com/api3dao/airnode/commit/59e7802e498b2cd4c5c7f3d3126809f2abcff5e8) Thanks [@vponline](https://github.com/vponline)! - Moves the hardcoded default gasLimit to constants

- [#898](https://github.com/api3dao/airnode/pull/898) [`85788473`](https://github.com/api3dao/airnode/commit/85788473f136bfcfdd1bce9d80121efe54f325bf) Thanks [@vponline](https://github.com/vponline)! - Update EIP1559 config values to numbers

- Updated dependencies [[`9ab6ea9c`](https://github.com/api3dao/airnode/commit/9ab6ea9c7a5e9d348dd06c6f95efd66aa6061477), [`bbc3b519`](https://github.com/api3dao/airnode/commit/bbc3b5195938d570bef4a79ab82c360d9d650970), [`8d4fd368`](https://github.com/api3dao/airnode/commit/8d4fd36888213cfb3866f328250946bb4c9f3028), [`fb9c57ad`](https://github.com/api3dao/airnode/commit/fb9c57adb8b5e476699103d2a2ef4c1a0a5318bf), [`6504c3c8`](https://github.com/api3dao/airnode/commit/6504c3c88fa39026f0392f0892ab6adc85115461), [`2accfc98`](https://github.com/api3dao/airnode/commit/2accfc98470f72f8463a4e80b01150ff4a0b2312), [`da0026cb`](https://github.com/api3dao/airnode/commit/da0026cbb1c714d9b2f9af622afb858b37316217), [`0ec9b739`](https://github.com/api3dao/airnode/commit/0ec9b739b5d56f7efcbf61d7c144d1ca322733f1), [`b093eb56`](https://github.com/api3dao/airnode/commit/b093eb5666db11892c5d31bb08366c541ab1d41b), [`3a94a49c`](https://github.com/api3dao/airnode/commit/3a94a49cbf7e7e620bcf0d8212a5efcfaab066a2), [`702b6a97`](https://github.com/api3dao/airnode/commit/702b6a97a07c86f93d5906e887874a96ae743586), [`0ed6277b`](https://github.com/api3dao/airnode/commit/0ed6277bdd789bfa48d97e6c5d179c9ba357a520), [`b37845cd`](https://github.com/api3dao/airnode/commit/b37845cde866e6a2e2afb1130c2afe3598779871), [`8c9de3e5`](https://github.com/api3dao/airnode/commit/8c9de3e5d78fff4ee8e989ef640914bde16692b2), [`47ff09d7`](https://github.com/api3dao/airnode/commit/47ff09d788ca1f45e17e8ab0c9e5d8e26bc96b26), [`4dbb639c`](https://github.com/api3dao/airnode/commit/4dbb639cfaf375f51e6635e7314c4b481054e9bd), [`b186009f`](https://github.com/api3dao/airnode/commit/b186009f8af3f6e58b874741afc7b622663ddd76), [`85788473`](https://github.com/api3dao/airnode/commit/85788473f136bfcfdd1bce9d80121efe54f325bf)]:
  - @api3/airnode-adapter@0.5.0
  - @api3/airnode-protocol@0.5.0
  - @api3/airnode-utilities@0.5.0
  - @api3/airnode-validator@0.5.0
  - @api3/airnode-abi@0.5.0
  - @api3/airnode-ois@0.5.0

## 0.4.1

### Patch Changes

- [`46aae23d`](https://github.com/api3dao/airnode/commit/46aae23d820cc7efa26e0295c7b94f0a1885a1cc) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

* [#840](https://github.com/api3dao/airnode/pull/840) [`8ef930cb`](https://github.com/api3dao/airnode/commit/8ef930cbb89a2a4fe0d4ff13d553cb2d9f9e5ba4) Thanks [@amarthadan](https://github.com/amarthadan)! - Move heartbeat API key to a request header

* Updated dependencies [[`46aae23d`](https://github.com/api3dao/airnode/commit/46aae23d820cc7efa26e0295c7b94f0a1885a1cc)]:
  - @api3/airnode-abi@0.4.1
  - @api3/airnode-adapter@0.4.1
  - @api3/airnode-ois@0.4.1
  - @api3/airnode-protocol@0.4.1
  - @api3/airnode-validator@0.4.1

## 0.4.0

### Minor Changes

- [#734](https://github.com/api3dao/airnode/pull/734) [`62debeee`](https://github.com/api3dao/airnode/commit/62debeeecd17c1894a5bd055d795253230b80abf) Thanks [@amarthadan](https://github.com/amarthadan)! - Verify sponsorWalletAddress in processTransations instead of initializeProvider for withdrawals

* [#772](https://github.com/api3dao/airnode/pull/772) [`42a23157`](https://github.com/api3dao/airnode/commit/42a23157b5c7e17a69a9aaf721422d503a6804c3) Thanks [@Siegrift](https://github.com/Siegrift)! - Make the protocol IDs start from 1

- [#740](https://github.com/api3dao/airnode/pull/740) [`de585e0f`](https://github.com/api3dao/airnode/commit/de585e0f7097e1cbf7dffb76652d090ce977068e) Thanks [@aquarat](https://github.com/aquarat)! - Initialise packages for v0.4.0

* [#724](https://github.com/api3dao/airnode/pull/724) [`8a93ec14`](https://github.com/api3dao/airnode/commit/8a93ec14eaa61c1ab45a3de559f14dff3c10534d) Thanks [@Siegrift](https://github.com/Siegrift)! - Limit the number of requests per sponsor in single Airnode run

- [#765](https://github.com/api3dao/airnode/pull/765) [`aa4d5d4f`](https://github.com/api3dao/airnode/commit/aa4d5d4f50c399060040673c163c5da238781401) Thanks [@Siegrift](https://github.com/Siegrift)! - Add per chain request limit (and ignore requests that exceed this limit)

* [#807](https://github.com/api3dao/airnode/pull/807) [`219b1301`](https://github.com/api3dao/airnode/commit/219b130140cd5ea1ccf9491e9cca8c2ec2e51532) Thanks [@aquarat](https://github.com/aquarat)! - Revise timeouts and memory allocations based on stress testing

- [#735](https://github.com/api3dao/airnode/pull/735) [`c057da59`](https://github.com/api3dao/airnode/commit/c057da595462b6d920b12b2a68229444d25ae659) Thanks [@aquarat](https://github.com/aquarat)! - Extended EIP-1559 implementation to be user configurable

* [#733](https://github.com/api3dao/airnode/pull/733) [`11b07cdd`](https://github.com/api3dao/airnode/commit/11b07cddbb9b232bb3f6081432755f65fc7e3deb) Thanks [@Siegrift](https://github.com/Siegrift)! - Move sponsor wallet check to callApi handler

- [#749](https://github.com/api3dao/airnode/pull/749) [`f3f0d6c9`](https://github.com/api3dao/airnode/commit/f3f0d6c973c3fe983168b20fe6264fbd70b9dca2) Thanks [@drgy](https://github.com/drgy)! - Choose validator template version based on the node/deployer version running it

* [#747](https://github.com/api3dao/airnode/pull/747) [`f1d301f4`](https://github.com/api3dao/airnode/commit/f1d301f40fc5167ef7763e5055e73dafbcf2000c) Thanks [@Siegrift](https://github.com/Siegrift)! - Move requestId and templateId verification to callApi handler

- [#742](https://github.com/api3dao/airnode/pull/742) [`8abeeedf`](https://github.com/api3dao/airnode/commit/8abeeedf1dd62665a8a68604560c9388581a1cbb) Thanks [@Siegrift](https://github.com/Siegrift)! - Move "testable" flag from OIS to "triggers" section in config.json

* [#787](https://github.com/api3dao/airnode/pull/787) [`d4a04845`](https://github.com/api3dao/airnode/commit/d4a04845b53c98088ec05ba7a7844f6c37e9d992) Thanks [@Siegrift](https://github.com/Siegrift)! - Implement sponsorAddress and sponsorWalletAddress relay security schemes

- [#774](https://github.com/api3dao/airnode/pull/774) [`53f6a3c9`](https://github.com/api3dao/airnode/commit/53f6a3c9ed694022fa630a7573d7ac6f828520be) Thanks [@Siegrift](https://github.com/Siegrift)! - Add string32 and bool options to Airnode ABI. This is actually a breaking change. Users should change "bytes32" to "string32" when using Airnode v0.4

* [`2e669ff2`](https://github.com/api3dao/airnode/commit/2e669ff251b7d7d32ab1eb9b234081871879135e) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

### Patch Changes

- [#767](https://github.com/api3dao/airnode/pull/767) [`d6e942d9`](https://github.com/api3dao/airnode/commit/d6e942d937b427ddaf7ec3fdf6f340d66c661099) Thanks [@aquarat](https://github.com/aquarat)! - Disable validation for cloud handler functions and introduce tests for the deployer

* [#726](https://github.com/api3dao/airnode/pull/726) [`484c10f5`](https://github.com/api3dao/airnode/commit/484c10f52246c543a0df88177eed52c62811c914) Thanks [@aquarat](https://github.com/aquarat)! - Implement EIP-1559 fulfillments

- [#791](https://github.com/api3dao/airnode/pull/791) [`05e61cda`](https://github.com/api3dao/airnode/commit/05e61cda526359b7f2f9b6904b0cd2de9e515d0f) Thanks [@dcroote](https://github.com/dcroote)! - Do not send API error messages on-chain and implement message trimming as additional protection

- Updated dependencies [[`42a23157`](https://github.com/api3dao/airnode/commit/42a23157b5c7e17a69a9aaf721422d503a6804c3), [`347e229f`](https://github.com/api3dao/airnode/commit/347e229fd2647b654cb10e79484ee4ff877a7e55), [`de585e0f`](https://github.com/api3dao/airnode/commit/de585e0f7097e1cbf7dffb76652d090ce977068e), [`b0a1b634`](https://github.com/api3dao/airnode/commit/b0a1b6346d17b48da45d3431b9799fe958204ddd), [`ab4f9802`](https://github.com/api3dao/airnode/commit/ab4f98029e497a652bf19f1005a25c94ce5a3618), [`aa4d5d4f`](https://github.com/api3dao/airnode/commit/aa4d5d4f50c399060040673c163c5da238781401), [`d6e942d9`](https://github.com/api3dao/airnode/commit/d6e942d937b427ddaf7ec3fdf6f340d66c661099), [`54d8f6f4`](https://github.com/api3dao/airnode/commit/54d8f6f4f03554561ffc496b186b437489e6c984), [`c057da59`](https://github.com/api3dao/airnode/commit/c057da595462b6d920b12b2a68229444d25ae659), [`f3f0d6c9`](https://github.com/api3dao/airnode/commit/f3f0d6c973c3fe983168b20fe6264fbd70b9dca2), [`8abeeedf`](https://github.com/api3dao/airnode/commit/8abeeedf1dd62665a8a68604560c9388581a1cbb), [`d4a04845`](https://github.com/api3dao/airnode/commit/d4a04845b53c98088ec05ba7a7844f6c37e9d992), [`53f6a3c9`](https://github.com/api3dao/airnode/commit/53f6a3c9ed694022fa630a7573d7ac6f828520be), [`2e669ff2`](https://github.com/api3dao/airnode/commit/2e669ff251b7d7d32ab1eb9b234081871879135e)]:
  - @api3/airnode-protocol@0.4.0
  - @api3/airnode-validator@0.4.0
  - @api3/airnode-ois@0.4.0
  - @api3/airnode-adapter@0.4.0
  - @api3/airnode-abi@0.4.0

## 0.3.1

### Patch Changes

- [`f7d66930`](https://github.com/api3dao/airnode/commit/f7d66930c04cc16a25fe4d982f740d2c9f4a483c) Thanks
  [@bbenligiray](https://github.com/bbenligiray)! - Release new version

- Updated dependencies
  [[`f7d66930`](https://github.com/api3dao/airnode/commit/f7d66930c04cc16a25fe4d982f740d2c9f4a483c)]:
  - @api3/airnode-abi@0.3.1
  - @api3/airnode-adapter@0.3.1
  - @api3/airnode-ois@0.3.1
  - @api3/airnode-protocol@0.3.1
  - @api3/airnode-validator@0.3.1

## 0.3.0

### Minor Changes

- [#697](https://github.com/api3dao/airnode/pull/697)
  [`83222d2d`](https://github.com/api3dao/airnode/commit/83222d2dac841dc71404933555894f24aefa432a) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Replace relay metadata for relay security schemes

* [#620](https://github.com/api3dao/airnode/pull/620)
  [`606b6e0f`](https://github.com/api3dao/airnode/commit/606b6e0f293958e0bf1168927e3f81a7c2dbb5a3) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Implement new values for "\_type" reserved parameter (address, bytes,
  string, string32 and arrays)

- [#688](https://github.com/api3dao/airnode/pull/688)
  [`77e70bdf`](https://github.com/api3dao/airnode/commit/77e70bdfee67e41b30f066ab70f746a20f578cc6) Thanks
  [@amarthadan](https://github.com/amarthadan)! - Add support for GCP cloud provider (except for HTTP gateway)

* Release new version

- [#667](https://github.com/api3dao/airnode/pull/667)
  [`9fd03aa7`](https://github.com/api3dao/airnode/commit/9fd03aa736d5b1a77c3950783135320c649e7f2d) Thanks
  [@amarthadan](https://github.com/amarthadan)! - Change format of `config.json` for better support of multiple cloud
  providers

* [#669](https://github.com/api3dao/airnode/pull/669)
  [`da698d19`](https://github.com/api3dao/airnode/commit/da698d194038cb4c6b5b9c1b35316b9870146d15) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Support multiple values for Airnode responses

### Patch Changes

- [#722](https://github.com/api3dao/airnode/pull/722)
  [`c0a99269`](https://github.com/api3dao/airnode/commit/c0a99269b3b3ee583da0d16e7778bc227416bd60) Thanks
  [@aquarat](https://github.com/aquarat)! - Apply timeouts for GCP based on stress tester results

- Updated dependencies
  [[`281a5014`](https://github.com/api3dao/airnode/commit/281a501404f6f53a0c62bbd18920af660de66cd1),
  [`83222d2d`](https://github.com/api3dao/airnode/commit/83222d2dac841dc71404933555894f24aefa432a),
  [`cc452301`](https://github.com/api3dao/airnode/commit/cc4523012d6983f8bdec9aa8ef0e4f1dffd63b62),
  [`606b6e0f`](https://github.com/api3dao/airnode/commit/606b6e0f293958e0bf1168927e3f81a7c2dbb5a3),
  [`a27a42f5`](https://github.com/api3dao/airnode/commit/a27a42f5d72ef30c0ef87d64ba338732f3d0ef4b),
  [`44d65077`](https://github.com/api3dao/airnode/commit/44d65077d97be2b98448b3ddd3093a3e99e64e66),
  [`62471f4c`](https://github.com/api3dao/airnode/commit/62471f4caed6ab3caf2d948f0ad15e6d8318367c),
  [`8015decf`](https://github.com/api3dao/airnode/commit/8015decfb985f404b360488d89d8b7e097090b39),
  [`9fd03aa7`](https://github.com/api3dao/airnode/commit/9fd03aa736d5b1a77c3950783135320c649e7f2d),
  [`da698d19`](https://github.com/api3dao/airnode/commit/da698d194038cb4c6b5b9c1b35316b9870146d15),
  [`1b7e116f`](https://github.com/api3dao/airnode/commit/1b7e116f68240857f572eb328f4417fdb0d07b47)]:
  - @api3/airnode-protocol@0.3.0
  - @api3/airnode-adapter@0.3.0
  - @api3/airnode-ois@0.3.0
  - @api3/airnode-validator@0.3.0
  - @api3/airnode-abi@0.3.0

## 0.2.2

### Patch Changes

- Release new version

* [#657](https://github.com/api3dao/airnode/pull/657)
  [`1f9ca298`](https://github.com/api3dao/airnode/commit/1f9ca298f485621354ceacadbbbb58cacd1bdf8f) Thanks
  [@amarthadan](https://github.com/amarthadan)! - Fix missing dependencies from Docker image builds

* Updated dependencies
  [[`8aa8f4f6`](https://github.com/api3dao/airnode/commit/8aa8f4f61568df9ad686914731ade648f1879c67)]:
  - @api3/airnode-validator@0.2.2
  - @api3/airnode-abi@0.2.2
  - @api3/airnode-adapter@0.2.2
  - @api3/airnode-ois@0.2.2
  - @api3/airnode-protocol@0.2.2

## 0.2.1

### Patch Changes

- Packages published again with npm v8

- Updated dependencies []:
  - @api3/airnode-abi@0.2.1
  - @api3/airnode-adapter@0.2.1
  - @api3/airnode-ois@0.2.1
  - @api3/airnode-protocol@0.2.1
  - @api3/airnode-validator@0.2.1

## 0.2.0

### Minor Changes

- [#639](https://github.com/api3dao/airnode/pull/639)
  [`f1c10185`](https://github.com/api3dao/airnode/commit/f1c10185498d9bafe799661ecd9e361a2c9ea55d) Thanks
  [@Siegrift](https://github.com/Siegrift)! - See https://medium.com/api3/beyond-pre-alpha-rrp-88717e9ed22d for a
  summary of the changes since the pre-alpha version

### Patch Changes

- Updated dependencies
  [[`f1c10185`](https://github.com/api3dao/airnode/commit/f1c10185498d9bafe799661ecd9e361a2c9ea55d)]:
  - @api3/airnode-abi@0.2.0
  - @api3/airnode-adapter@0.2.0
  - @api3/airnode-ois@0.2.0
  - @api3/airnode-protocol@0.2.0
  - @api3/airnode-validator@0.2.0
