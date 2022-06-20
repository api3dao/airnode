# @api3/airnode-utilities

## 0.7.1

### Patch Changes

- [`2c7fa21b`](https://github.com/api3dao/airnode/commit/2c7fa21b68c3c36bc2b6d4c66b5f7afffc337555) Thanks [@aquarat](https://github.com/aquarat)! - Bump patch version

## 0.7.0

### Minor Changes

- [#1043](https://github.com/api3dao/airnode/pull/1043) [`71f9a95e`](https://github.com/api3dao/airnode/commit/71f9a95e1f93fb2575fd6393795263b96cad4f40) Thanks [@vponline](https://github.com/vponline)! - Add gasPriceMultiplier config for legacy gas prices

* [#1025](https://github.com/api3dao/airnode/pull/1025) [`1c41ae78`](https://github.com/api3dao/airnode/commit/1c41ae78a1db8976730f28f8231b62bd1b4e883c) Thanks [@aquarat](https://github.com/aquarat)! - Enhance config defined pre and post processing

- [#1159](https://github.com/api3dao/airnode/pull/1159) [`260faa11`](https://github.com/api3dao/airnode/commit/260faa1104ee5170c8a884ddde02702b83cb6a85) Thanks [@Siegrift](https://github.com/Siegrift)! - Use default endpoint values, improve validation

* [#1089](https://github.com/api3dao/airnode/pull/1089) [`70dafa57`](https://github.com/api3dao/airnode/commit/70dafa575bc33c90823c0de83ea51c7d50788c9e) Thanks [@Siegrift](https://github.com/Siegrift)! - Support TS project references

- [#1127](https://github.com/api3dao/airnode/pull/1127) [`f3bcd689`](https://github.com/api3dao/airnode/commit/f3bcd6890cbf4d2687b0df8b91afe446f212332b) Thanks [@dcroote](https://github.com/dcroote)! - Remove unused tx constants from airnode-node as they have been relocated to airnode-utilities and promise-utils

* [#1075](https://github.com/api3dao/airnode/pull/1075) [`88507a9a`](https://github.com/api3dao/airnode/commit/88507a9ad4682d66800cd866ee298fb64ea4bb7f) Thanks [@dcroote](https://github.com/dcroote)! - Fix type of submitted transactions i.e. submit transactions with legacy pricing as legacy type

- [`415a2248`](https://github.com/api3dao/airnode/commit/415a224816bf6edf4ee8a8d6cae60d6e3302c161) Thanks [@aquarat](https://github.com/aquarat)! - Bump minor version for all packages

* [#1148](https://github.com/api3dao/airnode/pull/1148) [`d90a4d70`](https://github.com/api3dao/airnode/commit/d90a4d70f90c9d6798cac71da2cd8cdf20190b67) Thanks [@Siegrift](https://github.com/Siegrift)! - Implement legacy validator rules

### Patch Changes

- [#1158](https://github.com/api3dao/airnode/pull/1158) [`e42aa310`](https://github.com/api3dao/airnode/commit/e42aa3101d35f7968443ed166f57ae653e754095) Thanks [@Siegrift](https://github.com/Siegrift)! - Improve TS project references structure, fix published files for airnode-examples

* [#1073](https://github.com/api3dao/airnode/pull/1073) [`b0f6dadd`](https://github.com/api3dao/airnode/commit/b0f6dadd8f2a991d363400abea3b79c202aff103) Thanks [@vponline](https://github.com/vponline)! - Convert gasPriceMultiplier to BigNumber

- [#1231](https://github.com/api3dao/airnode/pull/1231) [`c3b7eee7`](https://github.com/api3dao/airnode/commit/c3b7eee7c9cc7efbfb418e954109c9587df7fc3d) Thanks [@dcroote](https://github.com/dcroote)! - Make "unit" required for priorityFee

## 0.6.0

### Minor Changes

- [`048a4c83`](https://github.com/api3dao/airnode/commit/048a4c830151947c4869cde9b6d5a7f67a606c31) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

* [#997](https://github.com/api3dao/airnode/pull/997) [`331a6b9d`](https://github.com/api3dao/airnode/commit/331a6b9dc6579fe922a423901983577e954dc9eb) Thanks [@vponline](https://github.com/vponline)! - Replace API_CALL_FULFILLMENT_GAS_LIMIT constant with fulfillmentGasLimit configuration option

## 0.5.0

### Minor Changes

- [#867](https://github.com/api3dao/airnode/pull/867) [`bbc3b519`](https://github.com/api3dao/airnode/commit/bbc3b5195938d570bef4a79ab82c360d9d650970) Thanks [@aquarat](https://github.com/aquarat)! - Refactored console calls to point to an abstracted version of the function in a new package, airnode-utilities

* [#933](https://github.com/api3dao/airnode/pull/933) [`6504c3c8`](https://github.com/api3dao/airnode/commit/6504c3c88fa39026f0392f0892ab6adc85115461) Thanks [@vponline](https://github.com/vponline)! - Move gas-prices implementation to airnode-utilities

- [`2accfc98`](https://github.com/api3dao/airnode/commit/2accfc98470f72f8463a4e80b01150ff4a0b2312) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

### Patch Changes

- [#893](https://github.com/api3dao/airnode/pull/893) [`da0026cb`](https://github.com/api3dao/airnode/commit/da0026cbb1c714d9b2f9af622afb858b37316217) Thanks [@aquarat](https://github.com/aquarat)! - Add back yarn pack to fix docker build process

* [#937](https://github.com/api3dao/airnode/pull/937) [`b093eb56`](https://github.com/api3dao/airnode/commit/b093eb5666db11892c5d31bb08366c541ab1d41b) Thanks @dependabot! - Fix tests after ethers version bump

- [#925](https://github.com/api3dao/airnode/pull/925) [`8c9de3e5`](https://github.com/api3dao/airnode/commit/8c9de3e5d78fff4ee8e989ef640914bde16692b2) Thanks [@aquarat](https://github.com/aquarat)! - Modify run-airnode-locally to handle being run in CI
