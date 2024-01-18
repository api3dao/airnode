# @api3/airnode-validator

## 0.13.0

### Minor Changes

- [#1888](https://github.com/api3dao/airnode/pull/1888) [`1da62631`](https://github.com/api3dao/airnode/commit/1da62631905cf4b49266f248c8c385b5106d4c4d) Thanks [@dcroote](https://github.com/dcroote)! - Bump OIS to v2.2.0 and make operationParameter optional within endpoint parameters

### Patch Changes

- [#1893](https://github.com/api3dao/airnode/pull/1893) [`cefc5e4a`](https://github.com/api3dao/airnode/commit/cefc5e4abcc0f10a9b0b84b9bf55af2f34ffe1bd) Thanks [@dcroote](https://github.com/dcroote)! - Bump ois to v2.2.1

- Updated dependencies [[`87cee037`](https://github.com/api3dao/airnode/commit/87cee0372afc60acb141ad308d3664172f3cbdb6), [`d2e5a04b`](https://github.com/api3dao/airnode/commit/d2e5a04bf6e88de1888f044dfb171344171ba0ea), [`1d7e4b2f`](https://github.com/api3dao/airnode/commit/1d7e4b2fe4467cee05a6d5f4b34b772d377337df), [`b447fcc5`](https://github.com/api3dao/airnode/commit/b447fcc5d82f63c9393e2ef5651cedf66809a4a3)]:
  - @api3/airnode-protocol@0.13.0

## 0.12.0

### Minor Changes

- [#1797](https://github.com/api3dao/airnode/pull/1797) [`0b7d89eb`](https://github.com/api3dao/airnode/commit/0b7d89eb582d63aa299216f3cc28d82cf7071981) Thanks [@aquarat](https://github.com/aquarat)! - Widen accepted types for parameters to allow for native types to be sent as JSON

- [#1707](https://github.com/api3dao/airnode/pull/1707) [`4226fbc9`](https://github.com/api3dao/airnode/commit/4226fbc9a6bd9d03cb4ad6c83dcfbd5fbde95994) Thanks [@dcroote](https://github.com/dcroote)! - Enforce the endpointId derivation scheme

- [#1828](https://github.com/api3dao/airnode/pull/1828) [`cf09dc6f`](https://github.com/api3dao/airnode/commit/cf09dc6ffca9587e28a6dcb3c7b99a1816bcb68b) Thanks [@bdrhn9](https://github.com/bdrhn9)! - Implement gas price strategy `sanitizedProviderRecommendedGasPrice`

- [#1817](https://github.com/api3dao/airnode/pull/1817) [`93bc917d`](https://github.com/api3dao/airnode/commit/93bc917d360e9c3993c6b6e44b806b1dfc67cb61) Thanks [@bdrhn9](https://github.com/bdrhn9)! - Estimate gas for RRP fulfillments

- [#1755](https://github.com/api3dao/airnode/pull/1755) [`deb1b358`](https://github.com/api3dao/airnode/commit/deb1b3583810ab979768a43d3c0eaec057843da8) Thanks [@dcroote](https://github.com/dcroote)! - Make AirnodeRrpV0 and RequesterAuthorizerWithErc721 addresses optional

### Patch Changes

- [#1814](https://github.com/api3dao/airnode/pull/1814) [`9b52f2d4`](https://github.com/api3dao/airnode/commit/9b52f2d492f08980346e93887ee3f0790be9e5be) Thanks [@dcroote](https://github.com/dcroote)! - fix: populate default contract addresses when loading config

- Updated dependencies [[`0c0c3529`](https://github.com/api3dao/airnode/commit/0c0c3529a090976040d2ed7e23ab8939e09a6f3c), [`345f2ec9`](https://github.com/api3dao/airnode/commit/345f2ec991008d8b86409aa365a0457adf350814), [`5d119a9e`](https://github.com/api3dao/airnode/commit/5d119a9e6cdd0174a8a832cf6dafc8247d3ce02e), [`f10ccaeb`](https://github.com/api3dao/airnode/commit/f10ccaeb1336670e8ec2d204b1b18115debefdbf), [`9062ea3b`](https://github.com/api3dao/airnode/commit/9062ea3bbae9d0c0db7bd1af00862db6682cb9b7), [`134b6ff2`](https://github.com/api3dao/airnode/commit/134b6ff215595167ff084916f66b51eeb718a456), [`c94ec660`](https://github.com/api3dao/airnode/commit/c94ec660b84a41f7856ee7813536a40bd01c77d4), [`cd8a30d0`](https://github.com/api3dao/airnode/commit/cd8a30d01414d354740c35fbbe765f76a2901c6a)]:
  - @api3/airnode-protocol@0.12.0

## 0.11.0

### Minor Changes

- [#1691](https://github.com/api3dao/airnode/pull/1691) [`ad642715`](https://github.com/api3dao/airnode/commit/ad642715afcfb9fe690239ce5f3e0482a4b289fb) Thanks [@Ashar2shahid](https://github.com/Ashar2shahid)! - update promise-utils to v0.4.0

- [#1663](https://github.com/api3dao/airnode/pull/1663) [`ca3398ce`](https://github.com/api3dao/airnode/commit/ca3398cedf6b0dc8cecd42b32c7f97856e700a21) Thanks [@amarthadan](https://github.com/amarthadan)! - Add OEV gateway

- [#1652](https://github.com/api3dao/airnode/pull/1652) [`b2f1edfa`](https://github.com/api3dao/airnode/commit/b2f1edfad867bb027f845b3dd2d601258ba7091d) Thanks [@dcroote](https://github.com/dcroote)! - Removes Node version 14 from pre/post-processing specification.
  To do so, bumps @api3/ois to 2.0.0 and zod to 3.20.6.

- [#1647](https://github.com/api3dao/airnode/pull/1647) [`a4929eee`](https://github.com/api3dao/airnode/commit/a4929eeefb5d7e40a37b59cfa11d1320a9ea2b32) Thanks [@dcroote](https://github.com/dcroote)! - Bump Node.js from 14 to 18

- [#1670](https://github.com/api3dao/airnode/pull/1670) [`1b486bb9`](https://github.com/api3dao/airnode/commit/1b486bb946d90c9a4d9ea1d5eb0d7aa5f99cac60) Thanks [@dcroote](https://github.com/dcroote)! - Implement RequesterAuthorizerWithErc721 authorizers

## 0.10.0

### Minor Changes

- [#1497](https://github.com/api3dao/airnode/pull/1497) [`90a59073`](https://github.com/api3dao/airnode/commit/90a59073fdb96e496b54ff1225e80ed2cfd60bf4) Thanks [@amarthadan](https://github.com/amarthadan)! - Allow users to remove the deployment based on the deployment ID

- [#1522](https://github.com/api3dao/airnode/pull/1522) [`55dd3c68`](https://github.com/api3dao/airnode/commit/55dd3c68bd075f998dae1148ee246298d536347e) Thanks [@Siegrift](https://github.com/Siegrift)! - Remove heartbeatId from config and heartbeat payload

- [#1497](https://github.com/api3dao/airnode/pull/1497) [`c5feadb2`](https://github.com/api3dao/airnode/commit/c5feadb20f2ff03ac625fc1348728de6605392b8) Thanks [@amarthadan](https://github.com/amarthadan)! - Remove unnecessary validator bundling

- [#1597](https://github.com/api3dao/airnode/pull/1597) [`8844aa92`](https://github.com/api3dao/airnode/commit/8844aa92a587c17dde56f9188ca7a72b38ccf000) Thanks [@dcroote](https://github.com/dcroote)! - Bump @api3/ois to 1.4.0 with necessary zod version bump to 3.20

- [#1615](https://github.com/api3dao/airnode/pull/1615) [`dafe9724`](https://github.com/api3dao/airnode/commit/dafe972428ba11c8a365aa2d7dd6e95bf9c370d4) Thanks [@dcroote](https://github.com/dcroote)! - Add new \_minConfirmations reserved parameter to allow minConfirmations to be specified by a requester

- [#1522](https://github.com/api3dao/airnode/pull/1522) [`55dd3c68`](https://github.com/api3dao/airnode/commit/55dd3c68bd075f998dae1148ee246298d536347e) Thanks [@Siegrift](https://github.com/Siegrift)! - Add heartbeat payload signing

- [#1577](https://github.com/api3dao/airnode/pull/1577) [`82273813`](https://github.com/api3dao/airnode/commit/82273813137f66e03b50f37b3a40f11f84691dd5) Thanks [@amarthadan](https://github.com/amarthadan)! - Replace Airnode's short address with deployment ID

- [#1609](https://github.com/api3dao/airnode/pull/1609) [`620aa0eb`](https://github.com/api3dao/airnode/commit/620aa0eb851a95311c963f760e5545a42eec633a) Thanks [@dcroote](https://github.com/dcroote)! - Add new \_gasPrice reserved parameter

- [#1586](https://github.com/api3dao/airnode/pull/1586) [`d56dfa6d`](https://github.com/api3dao/airnode/commit/d56dfa6d13ec3c58a8c40c5c1e47fc2ab9f66b9c) Thanks [@metobom](https://github.com/metobom)! - Added API call skip feature.

- [#1488](https://github.com/api3dao/airnode/pull/1488) [`4b284365`](https://github.com/api3dao/airnode/commit/4b2843650f6858328c12f552574e3a76b44175f4) Thanks [@dcroote](https://github.com/dcroote)! - Enable cross-chain authorizers

### Patch Changes

- [#1522](https://github.com/api3dao/airnode/pull/1522) [`55dd3c68`](https://github.com/api3dao/airnode/commit/55dd3c68bd075f998dae1148ee246298d536347e) Thanks [@Siegrift](https://github.com/Siegrift)! - Add cloud_provider, stage, region to heartbeat payload

## 0.9.0

### Minor Changes

- 4b3db2be: Store deployments in a common bucket
- 488a717e: Bump @api3/ois to 1.1.2 with necessary zod version bump
- 6327dd7d: Bump @api3/ois to 1.2.0 with necessary zod version bump

## 0.8.0

### Minor Changes

- 87ff06e3: Unify error handling of AWS and GCP gateways
- 8abc3d4e: Automatically try removing failed Airnode deployment
- aac8fab3: Support HTTP gateways with airnode-client
- eedbba54: Remove gateway URLs from receipt.json
- c4e33ea7: Add per-endpoint rrp response caching via new (required) `cacheResponses` flag in triggers.rrp[n] of config.json.
- b799a215: Add authorizations configuration to config.json
- 85da1624: Replace gas prices with gas oracle strategies
- d7ca4af8: Add corsOrigins field to config.json, handle CORS checks in deployer handlers, add OPTIONS http method to terraform templates
- c7d689e7: Add authorizer type to config.json
- 0f68d678: Add success property inside receipt.json
- e34bfb8e: Link monorepo packages using project references

### Patch Changes

- c2c2281e: Remove `hearbeatId` and `api` object from `receipt.json`
- ffba0579: Implement relayRequestId security scheme and use it in the the relay security schemes example integration
- 11d49f21: Support multiline secrets in validator
- 55022c55: Improve validator cloudProvider error message

## 0.7.1

### Patch Changes

- [`2c7fa21b`](https://github.com/api3dao/airnode/commit/2c7fa21b68c3c36bc2b6d4c66b5f7afffc337555) Thanks [@aquarat](https://github.com/aquarat)! - Bump patch version

- Updated dependencies [[`2c7fa21b`](https://github.com/api3dao/airnode/commit/2c7fa21b68c3c36bc2b6d4c66b5f7afffc337555)]:
  - @api3/airnode-utilities@0.7.1

## 0.7.0

### Minor Changes

- [#1043](https://github.com/api3dao/airnode/pull/1043) [`71f9a95e`](https://github.com/api3dao/airnode/commit/71f9a95e1f93fb2575fd6393795263b96cad4f40) Thanks [@vponline](https://github.com/vponline)! - Add gasPriceMultiplier config for legacy gas prices

* [#1177](https://github.com/api3dao/airnode/pull/1177) [`46858ba8`](https://github.com/api3dao/airnode/commit/46858ba817b665ab6adc6e5be2a7808ab4ab1e6d) Thanks [@dcroote](https://github.com/dcroote)! - Fail validation with empty secret value

- [#1025](https://github.com/api3dao/airnode/pull/1025) [`1c41ae78`](https://github.com/api3dao/airnode/commit/1c41ae78a1db8976730f28f8231b62bd1b4e883c) Thanks [@aquarat](https://github.com/aquarat)! - Enhance config defined pre and post processing

* [#1100](https://github.com/api3dao/airnode/pull/1100) [`bff29ae5`](https://github.com/api3dao/airnode/commit/bff29ae55cf366926731db50ca923238dc9b0ad2) Thanks [@Siegrift](https://github.com/Siegrift)! - Ensure bijection between “apiSpecification.paths” and "parameters"

- [#1118](https://github.com/api3dao/airnode/pull/1118) [`a0d02552`](https://github.com/api3dao/airnode/commit/a0d025524b84a599f0ab7c4387d7a2aca02f2335) Thanks [@amarthadan](https://github.com/amarthadan)! - Refine package.json validation

* [#1172](https://github.com/api3dao/airnode/pull/1172) [`1efa53b8`](https://github.com/api3dao/airnode/commit/1efa53b87d3067fc9fc4982d6d6d22630dc81180) Thanks [@Siegrift](https://github.com/Siegrift)! - Fail validation when interpolating secret with unset value

- [#1008](https://github.com/api3dao/airnode/pull/1008) [`f6e6c15b`](https://github.com/api3dao/airnode/commit/f6e6c15be081938e4c6c10fd56bd3ee928457d6f) Thanks [@aquarat](https://github.com/aquarat)! - Add config.json based pre and post-processing

* [#1144](https://github.com/api3dao/airnode/pull/1144) [`4aadb2ce`](https://github.com/api3dao/airnode/commit/4aadb2ce42383940ba157159215d6044720122c3) Thanks [@amarthadan](https://github.com/amarthadan)! - Enable strict validation mode in validator

- [#1141](https://github.com/api3dao/airnode/pull/1141) [`33f9e298`](https://github.com/api3dao/airnode/commit/33f9e298d487845eaf0a43ab788b6259c6112544) Thanks [@amarthadan](https://github.com/amarthadan)! - Add validation checks for references within triggers

* [#1102](https://github.com/api3dao/airnode/pull/1102) [`09d01d0b`](https://github.com/api3dao/airnode/commit/09d01d0bcc8856eab6ecd60b0ca59a0119a71468) Thanks [@acenolaza](https://github.com/acenolaza)! - Moves securityScheme reference check to airnode-validator package

- [#1140](https://github.com/api3dao/airnode/pull/1140) [`b0771eb7`](https://github.com/api3dao/airnode/commit/b0771eb73b49a1f520ecd86aa254c0d3b2f8f5a2) Thanks [@amarthadan](https://github.com/amarthadan)! - Use zod generated schema TS types instead of custom ones

* [#1159](https://github.com/api3dao/airnode/pull/1159) [`260faa11`](https://github.com/api3dao/airnode/commit/260faa1104ee5170c8a884ddde02702b83cb6a85) Thanks [@Siegrift](https://github.com/Siegrift)! - Use default endpoint values, improve validation

- [#1052](https://github.com/api3dao/airnode/pull/1052) [`0561f407`](https://github.com/api3dao/airnode/commit/0561f407dc379ed10bb2ed6ef7eaf064a5a1c09a) Thanks [@Siegrift](https://github.com/Siegrift)! - Enforce node version in validator

* [#1154](https://github.com/api3dao/airnode/pull/1154) [`9175f5c3`](https://github.com/api3dao/airnode/commit/9175f5c3ce47c778b29579f6315a58fd925473c4) Thanks [@amarthadan](https://github.com/amarthadan)! - Reject configuration with both relay metadata security schemes and gateways

- [#1053](https://github.com/api3dao/airnode/pull/1053) [`dc235126`](https://github.com/api3dao/airnode/commit/dc235126c744da1fc1df06ae0381cf7efe3842b1) Thanks [@Siegrift](https://github.com/Siegrift)! - Add better error message when there is a missing secret in interpolation

* [#1051](https://github.com/api3dao/airnode/pull/1051) [`d5c9dde6`](https://github.com/api3dao/airnode/commit/d5c9dde6cd1c5ff25e05014ea05573c297350be0) Thanks [@Siegrift](https://github.com/Siegrift)! - Improved validator bundling

- [#1049](https://github.com/api3dao/airnode/pull/1049) [`4de2b8ef`](https://github.com/api3dao/airnode/commit/4de2b8efc2bbeec5c35e02c6e99b7b980f47e4d4) Thanks [@Siegrift](https://github.com/Siegrift)! - Create validator CLI

* [#1103](https://github.com/api3dao/airnode/pull/1103) [`9cb94bc0`](https://github.com/api3dao/airnode/commit/9cb94bc0bffb3c99e16e8060b63cf753c669924f) Thanks [@dcroote](https://github.com/dcroote)! - Validate chain options by type of transaction

- [#1089](https://github.com/api3dao/airnode/pull/1089) [`70dafa57`](https://github.com/api3dao/airnode/commit/70dafa575bc33c90823c0de83ea51c7d50788c9e) Thanks [@Siegrift](https://github.com/Siegrift)! - Support TS project references

* [#1126](https://github.com/api3dao/airnode/pull/1126) [`6427dc79`](https://github.com/api3dao/airnode/commit/6427dc797bef286ae9ea2d2cf1a3d01b315e143f) Thanks [@Siegrift](https://github.com/Siegrift)! - Allow parameters with same name, but different location

- [#1047](https://github.com/api3dao/airnode/pull/1047) [`c4873921`](https://github.com/api3dao/airnode/commit/c4873921949a29afcd0b5a85c33b615779845325) Thanks [@vponline](https://github.com/vponline)! - Remove v1 validator

* [#1145](https://github.com/api3dao/airnode/pull/1145) [`6e76a776`](https://github.com/api3dao/airnode/commit/6e76a77653a55c6f7f3d7f1a6d246589efb387c1) Thanks [@amarthadan](https://github.com/amarthadan)! - Fix uniqueness test for AWS API gateway keys

- [#1101](https://github.com/api3dao/airnode/pull/1101) [`d1165d86`](https://github.com/api3dao/airnode/commit/d1165d8631bfc1e81955031a9ed2c54d705e1e89) Thanks [@vponline](https://github.com/vponline)! - Add support for templates in config.json and skip fetching valid templates from chain

* [`415a2248`](https://github.com/api3dao/airnode/commit/415a224816bf6edf4ee8a8d6cae60d6e3302c161) Thanks [@aquarat](https://github.com/aquarat)! - Bump minor version for all packages

- [#1048](https://github.com/api3dao/airnode/pull/1048) [`499726e0`](https://github.com/api3dao/airnode/commit/499726e0420ff6356ff1a937a8d77c0e605ced5f) Thanks [@Siegrift](https://github.com/Siegrift)! - Remove skipValidation parameter from config.json

* [#1108](https://github.com/api3dao/airnode/pull/1108) [`8a0dab13`](https://github.com/api3dao/airnode/commit/8a0dab138ead814df09e45ddb3bbf9166fda5b67) Thanks [@Siegrift](https://github.com/Siegrift)! - Ensure API specification params match endpoint params

- [#1143](https://github.com/api3dao/airnode/pull/1143) [`bce3600f`](https://github.com/api3dao/airnode/commit/bce3600feb5febf075987b357f0c788c29fbaf3b) Thanks [@Siegrift](https://github.com/Siegrift)! - Allow setTimeout/setInterval and escaping interpolation in processing snippets

* [#1074](https://github.com/api3dao/airnode/pull/1074) [`39b3a946`](https://github.com/api3dao/airnode/commit/39b3a9469dd8bc8fea06aece573a83a9df821d7a) Thanks [@Siegrift](https://github.com/Siegrift)! - Disallow same API gateway keys for AWS

- [#1131](https://github.com/api3dao/airnode/pull/1131) [`bd4becb6`](https://github.com/api3dao/airnode/commit/bd4becb68ba334958b598f5a56e0e31278b0a71d) Thanks [@dcroote](https://github.com/dcroote)! - Introduces an optional `withdrawalRemainder` within chain `options` of `config.json` that gets subtracted from the funds returned to the sponsor when making a withdrawal.

* [#1148](https://github.com/api3dao/airnode/pull/1148) [`d90a4d70`](https://github.com/api3dao/airnode/commit/d90a4d70f90c9d6798cac71da2cd8cdf20190b67) Thanks [@Siegrift](https://github.com/Siegrift)! - Implement legacy validator rules

### Patch Changes

- [#1158](https://github.com/api3dao/airnode/pull/1158) [`e42aa310`](https://github.com/api3dao/airnode/commit/e42aa3101d35f7968443ed166f57ae653e754095) Thanks [@Siegrift](https://github.com/Siegrift)! - Improve TS project references structure, fix published files for airnode-examples

* [#1157](https://github.com/api3dao/airnode/pull/1157) [`8b455834`](https://github.com/api3dao/airnode/commit/8b455834f13788a9d76def4babb2c55cd6066472) Thanks [@dcroote](https://github.com/dcroote)! - Add upper bound to Amount numbers

- [#1073](https://github.com/api3dao/airnode/pull/1073) [`b0f6dadd`](https://github.com/api3dao/airnode/commit/b0f6dadd8f2a991d363400abea3b79c202aff103) Thanks [@vponline](https://github.com/vponline)! - Convert gasPriceMultiplier to BigNumber

* [#1231](https://github.com/api3dao/airnode/pull/1231) [`c3b7eee7`](https://github.com/api3dao/airnode/commit/c3b7eee7c9cc7efbfb418e954109c9587df7fc3d) Thanks [@dcroote](https://github.com/dcroote)! - Make "unit" required for priorityFee

- [#1132](https://github.com/api3dao/airnode/pull/1132) [`0c3d0d6d`](https://github.com/api3dao/airnode/commit/0c3d0d6d07532989cac2f54919861c4cd3f98d0f) Thanks [@dcroote](https://github.com/dcroote)! - Add jest to devDependencies

* [#1171](https://github.com/api3dao/airnode/pull/1171) [`a1b3200e`](https://github.com/api3dao/airnode/commit/a1b3200e12875e8151578a58347562fc643fb5fe) Thanks [@Siegrift](https://github.com/Siegrift)! - Add more tests validating secrets naming

* Updated dependencies [[`71f9a95e`](https://github.com/api3dao/airnode/commit/71f9a95e1f93fb2575fd6393795263b96cad4f40), [`e42aa310`](https://github.com/api3dao/airnode/commit/e42aa3101d35f7968443ed166f57ae653e754095), [`1c41ae78`](https://github.com/api3dao/airnode/commit/1c41ae78a1db8976730f28f8231b62bd1b4e883c), [`b0f6dadd`](https://github.com/api3dao/airnode/commit/b0f6dadd8f2a991d363400abea3b79c202aff103), [`260faa11`](https://github.com/api3dao/airnode/commit/260faa1104ee5170c8a884ddde02702b83cb6a85), [`c3b7eee7`](https://github.com/api3dao/airnode/commit/c3b7eee7c9cc7efbfb418e954109c9587df7fc3d), [`70dafa57`](https://github.com/api3dao/airnode/commit/70dafa575bc33c90823c0de83ea51c7d50788c9e), [`f3bcd689`](https://github.com/api3dao/airnode/commit/f3bcd6890cbf4d2687b0df8b91afe446f212332b), [`88507a9a`](https://github.com/api3dao/airnode/commit/88507a9ad4682d66800cd866ee298fb64ea4bb7f), [`415a2248`](https://github.com/api3dao/airnode/commit/415a224816bf6edf4ee8a8d6cae60d6e3302c161), [`d90a4d70`](https://github.com/api3dao/airnode/commit/d90a4d70f90c9d6798cac71da2cd8cdf20190b67)]:
  - @api3/airnode-utilities@0.7.0

## 0.6.0

### Minor Changes

- [`048a4c83`](https://github.com/api3dao/airnode/commit/048a4c830151947c4869cde9b6d5a7f67a606c31) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

* [#997](https://github.com/api3dao/airnode/pull/997) [`331a6b9d`](https://github.com/api3dao/airnode/commit/331a6b9dc6579fe922a423901983577e954dc9eb) Thanks [@vponline](https://github.com/vponline)! - Replace API_CALL_FULFILLMENT_GAS_LIMIT constant with fulfillmentGasLimit configuration option

### Patch Changes

- Updated dependencies [[`048a4c83`](https://github.com/api3dao/airnode/commit/048a4c830151947c4869cde9b6d5a7f67a606c31), [`331a6b9d`](https://github.com/api3dao/airnode/commit/331a6b9dc6579fe922a423901983577e954dc9eb)]:
  - @api3/airnode-utilities@0.6.0

## 0.5.0

### Minor Changes

- [#867](https://github.com/api3dao/airnode/pull/867) [`bbc3b519`](https://github.com/api3dao/airnode/commit/bbc3b5195938d570bef4a79ab82c360d9d650970) Thanks [@aquarat](https://github.com/aquarat)! - Refactored console calls to point to an abstracted version of the function in a new package, airnode-utilities

* [`2accfc98`](https://github.com/api3dao/airnode/commit/2accfc98470f72f8463a4e80b01150ff4a0b2312) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

- [#820](https://github.com/api3dao/airnode/pull/820) [`0ec9b739`](https://github.com/api3dao/airnode/commit/0ec9b739b5d56f7efcbf61d7c144d1ca322733f1) Thanks [@amarthadan](https://github.com/amarthadan)! - Maximal concurrency of serverless functions is set based on the chain settings (maxConcurrency field)
  Add option to disable concurrency reservations for all serverless functions

* [#832](https://github.com/api3dao/airnode/pull/832) [`702b6a97`](https://github.com/api3dao/airnode/commit/702b6a97a07c86f93d5906e887874a96ae743586) Thanks [@amarthadan](https://github.com/amarthadan)! - Add option to set maximum concurrency for HTTP gateway

- [#951](https://github.com/api3dao/airnode/pull/951) [`0ed6277b`](https://github.com/api3dao/airnode/commit/0ed6277bdd789bfa48d97e6c5d179c9ba357a520) Thanks [@dcroote](https://github.com/dcroote)! - Remove RequestStatus enum and remove ignoreBlockedRequestsAfterBlocks from request metadata. Requests that were previously assigned a status like blocked, errored, or fulfilled are now dropped.

* [#843](https://github.com/api3dao/airnode/pull/843) [`b37845cd`](https://github.com/api3dao/airnode/commit/b37845cde866e6a2e2afb1130c2afe3598779871) Thanks [@amarthadan](https://github.com/amarthadan)! - Add endpoint for getting signed data for beacon updates

- [#835](https://github.com/api3dao/airnode/pull/835) [`b186009f`](https://github.com/api3dao/airnode/commit/b186009f8af3f6e58b874741afc7b622663ddd76) Thanks [@Siegrift](https://github.com/Siegrift)! - Redesign airnode-validator and implement a PoC

### Patch Changes

- [#848](https://github.com/api3dao/airnode/pull/848) [`8d4fd368`](https://github.com/api3dao/airnode/commit/8d4fd36888213cfb3866f328250946bb4c9f3028) Thanks [@Siegrift](https://github.com/Siegrift)! - Use the same version of dependencies across packages

* [#897](https://github.com/api3dao/airnode/pull/897) [`fb9c57ad`](https://github.com/api3dao/airnode/commit/fb9c57adb8b5e476699103d2a2ef4c1a0a5318bf) Thanks [@aquarat](https://github.com/aquarat)! - Revert of eip1559-related changes

- [#937](https://github.com/api3dao/airnode/pull/937) [`b093eb56`](https://github.com/api3dao/airnode/commit/b093eb5666db11892c5d31bb08366c541ab1d41b) Thanks @dependabot! - Fix tests after ethers version bump

* [#898](https://github.com/api3dao/airnode/pull/898) [`85788473`](https://github.com/api3dao/airnode/commit/85788473f136bfcfdd1bce9d80121efe54f325bf) Thanks [@vponline](https://github.com/vponline)! - Update EIP1559 config values to numbers

* Updated dependencies [[`bbc3b519`](https://github.com/api3dao/airnode/commit/bbc3b5195938d570bef4a79ab82c360d9d650970), [`6504c3c8`](https://github.com/api3dao/airnode/commit/6504c3c88fa39026f0392f0892ab6adc85115461), [`2accfc98`](https://github.com/api3dao/airnode/commit/2accfc98470f72f8463a4e80b01150ff4a0b2312), [`da0026cb`](https://github.com/api3dao/airnode/commit/da0026cbb1c714d9b2f9af622afb858b37316217), [`b093eb56`](https://github.com/api3dao/airnode/commit/b093eb5666db11892c5d31bb08366c541ab1d41b), [`8c9de3e5`](https://github.com/api3dao/airnode/commit/8c9de3e5d78fff4ee8e989ef640914bde16692b2)]:
  - @api3/airnode-utilities@0.5.0

## 0.4.1

### Patch Changes

- [`46aae23d`](https://github.com/api3dao/airnode/commit/46aae23d820cc7efa26e0295c7b94f0a1885a1cc) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

## 0.4.0

### Minor Changes

- [#740](https://github.com/api3dao/airnode/pull/740) [`de585e0f`](https://github.com/api3dao/airnode/commit/de585e0f7097e1cbf7dffb76652d090ce977068e) Thanks [@aquarat](https://github.com/aquarat)! - Initialise packages for v0.4.0

* [#765](https://github.com/api3dao/airnode/pull/765) [`aa4d5d4f`](https://github.com/api3dao/airnode/commit/aa4d5d4f50c399060040673c163c5da238781401) Thanks [@Siegrift](https://github.com/Siegrift)! - Add per chain request limit (and ignore requests that exceed this limit)

- [#751](https://github.com/api3dao/airnode/pull/751) [`54d8f6f4`](https://github.com/api3dao/airnode/commit/54d8f6f4f03554561ffc496b186b437489e6c984) Thanks [@drgy](https://github.com/drgy)! - Update OIS version in validator templates to 1.0.0

* [#735](https://github.com/api3dao/airnode/pull/735) [`c057da59`](https://github.com/api3dao/airnode/commit/c057da595462b6d920b12b2a68229444d25ae659) Thanks [@aquarat](https://github.com/aquarat)! - Extended EIP-1559 implementation to be user configurable

- [#749](https://github.com/api3dao/airnode/pull/749) [`f3f0d6c9`](https://github.com/api3dao/airnode/commit/f3f0d6c973c3fe983168b20fe6264fbd70b9dca2) Thanks [@drgy](https://github.com/drgy)! - Choose validator template version based on the node/deployer version running it

* [#742](https://github.com/api3dao/airnode/pull/742) [`8abeeedf`](https://github.com/api3dao/airnode/commit/8abeeedf1dd62665a8a68604560c9388581a1cbb) Thanks [@Siegrift](https://github.com/Siegrift)! - Move "testable" flag from OIS to "triggers" section in config.json

- [`2e669ff2`](https://github.com/api3dao/airnode/commit/2e669ff251b7d7d32ab1eb9b234081871879135e) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

### Patch Changes

- [#809](https://github.com/api3dao/airnode/pull/809) [`347e229f`](https://github.com/api3dao/airnode/commit/347e229fd2647b654cb10e79484ee4ff877a7e55) Thanks [@dcroote](https://github.com/dcroote)! - Add relay security schemes example integration and fix missing relaySponsorAddress and relaySponsorWalletAddress in validator

* [#762](https://github.com/api3dao/airnode/pull/762) [`b0a1b634`](https://github.com/api3dao/airnode/commit/b0a1b6346d17b48da45d3431b9799fe958204ddd) Thanks [@amarthadan](https://github.com/amarthadan)! - Fix validator template operationParameter regex

- [#760](https://github.com/api3dao/airnode/pull/760) [`ab4f9802`](https://github.com/api3dao/airnode/commit/ab4f98029e497a652bf19f1005a25c94ce5a3618) Thanks [@amarthadan](https://github.com/amarthadan)! - Force stage deployment variable to be lowercase

* [#767](https://github.com/api3dao/airnode/pull/767) [`d6e942d9`](https://github.com/api3dao/airnode/commit/d6e942d937b427ddaf7ec3fdf6f340d66c661099) Thanks [@aquarat](https://github.com/aquarat)! - Disable validation for cloud handler functions and introduce tests for the deployer

## 0.3.1

### Patch Changes

- [`f7d66930`](https://github.com/api3dao/airnode/commit/f7d66930c04cc16a25fe4d982f740d2c9f4a483c) Thanks
  [@bbenligiray](https://github.com/bbenligiray)! - Release new version

## 0.3.0

### Minor Changes

- [#697](https://github.com/api3dao/airnode/pull/697)
  [`83222d2d`](https://github.com/api3dao/airnode/commit/83222d2dac841dc71404933555894f24aefa432a) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Replace relay metadata for relay security schemes

* Release new version

- [#699](https://github.com/api3dao/airnode/pull/699)
  [`8015decf`](https://github.com/api3dao/airnode/commit/8015decfb985f404b360488d89d8b7e097090b39) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Add v0.3 validator templates

* [#667](https://github.com/api3dao/airnode/pull/667)
  [`9fd03aa7`](https://github.com/api3dao/airnode/commit/9fd03aa736d5b1a77c3950783135320c649e7f2d) Thanks
  [@amarthadan](https://github.com/amarthadan)! - Change format of `config.json` for better support of multiple cloud
  providers

## 0.2.2

### Patch Changes

- [#659](https://github.com/api3dao/airnode/pull/659)
  [`8aa8f4f6`](https://github.com/api3dao/airnode/commit/8aa8f4f61568df9ad686914731ade648f1879c67) Thanks
  [@amarthadan](https://github.com/amarthadan)! - Temporarily switched `nodeVersion` matching to just a warning

* Release new version

## 0.2.1

### Patch Changes

- Packages published again with npm v8

## 0.2.0

### Minor Changes

- [#639](https://github.com/api3dao/airnode/pull/639)
  [`f1c10185`](https://github.com/api3dao/airnode/commit/f1c10185498d9bafe799661ecd9e361a2c9ea55d) Thanks
  [@Siegrift](https://github.com/Siegrift)! - See https://medium.com/api3/beyond-pre-alpha-rrp-88717e9ed22d for a
  summary of the changes since the pre-alpha version
