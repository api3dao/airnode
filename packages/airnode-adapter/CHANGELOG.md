# @api3/airnode-adapter

## 0.13.0

### Minor Changes

- [#1888](https://github.com/api3dao/airnode/pull/1888) [`1da62631`](https://github.com/api3dao/airnode/commit/1da62631905cf4b49266f248c8c385b5106d4c4d) Thanks [@dcroote](https://github.com/dcroote)! - Bump OIS to v2.2.0 and make operationParameter optional within endpoint parameters

### Patch Changes

- [#1893](https://github.com/api3dao/airnode/pull/1893) [`cefc5e4a`](https://github.com/api3dao/airnode/commit/cefc5e4abcc0f10a9b0b84b9bf55af2f34ffe1bd) Thanks [@dcroote](https://github.com/dcroote)! - Bump ois to v2.2.1

- [#1825](https://github.com/api3dao/airnode/pull/1825) [`b447fcc5`](https://github.com/api3dao/airnode/commit/b447fcc5d82f63c9393e2ef5651cedf66809a4a3) Thanks [@renovate](https://github.com/apps/renovate)! - Apply prettier v3 formatting

## 0.12.0

### Minor Changes

- [#1743](https://github.com/api3dao/airnode/pull/1743) [`345f2ec9`](https://github.com/api3dao/airnode/commit/345f2ec991008d8b86409aa365a0457adf350814) Thanks [@dcroote](https://github.com/dcroote)! - Bump hardhat from 2.10.2 to 2.14.0 and add back to Renovate

## 0.11.0

### Minor Changes

- [#1691](https://github.com/api3dao/airnode/pull/1691) [`ad642715`](https://github.com/api3dao/airnode/commit/ad642715afcfb9fe690239ce5f3e0482a4b289fb) Thanks [@Ashar2shahid](https://github.com/Ashar2shahid)! - update promise-utils to v0.4.0

- [#1652](https://github.com/api3dao/airnode/pull/1652) [`b2f1edfa`](https://github.com/api3dao/airnode/commit/b2f1edfad867bb027f845b3dd2d601258ba7091d) Thanks [@dcroote](https://github.com/dcroote)! - Removes Node version 14 from pre/post-processing specification.
  To do so, bumps @api3/ois to 2.0.0 and zod to 3.20.6.

- [#1647](https://github.com/api3dao/airnode/pull/1647) [`a4929eee`](https://github.com/api3dao/airnode/commit/a4929eeefb5d7e40a37b59cfa11d1320a9ea2b32) Thanks [@dcroote](https://github.com/dcroote)! - Bump Node.js from 14 to 18

## 0.10.0

### Minor Changes

- [#1597](https://github.com/api3dao/airnode/pull/1597) [`8844aa92`](https://github.com/api3dao/airnode/commit/8844aa92a587c17dde56f9188ca7a72b38ccf000) Thanks [@dcroote](https://github.com/dcroote)! - Bump @api3/ois to 1.4.0 with necessary zod version bump to 3.20

- [#1615](https://github.com/api3dao/airnode/pull/1615) [`dafe9724`](https://github.com/api3dao/airnode/commit/dafe972428ba11c8a365aa2d7dd6e95bf9c370d4) Thanks [@dcroote](https://github.com/dcroote)! - Add new \_minConfirmations reserved parameter to allow minConfirmations to be specified by a requester

- [#1609](https://github.com/api3dao/airnode/pull/1609) [`620aa0eb`](https://github.com/api3dao/airnode/commit/620aa0eb851a95311c963f760e5545a42eec633a) Thanks [@dcroote](https://github.com/dcroote)! - Add new \_gasPrice reserved parameter

- [#1586](https://github.com/api3dao/airnode/pull/1586) [`d56dfa6d`](https://github.com/api3dao/airnode/commit/d56dfa6d13ec3c58a8c40c5c1e47fc2ab9f66b9c) Thanks [@metobom](https://github.com/metobom)! - Added API call skip feature.

### Patch Changes

- [#1591](https://github.com/api3dao/airnode/pull/1591) [`94b072b3`](https://github.com/api3dao/airnode/commit/94b072b39fa784977fa29f1cb2bb373db5984d7f) Thanks [@dcroote](https://github.com/dcroote)! - Unpin axios after v1.2.1 patch release

- [#1553](https://github.com/api3dao/airnode/pull/1553) [`f3de2677`](https://github.com/api3dao/airnode/commit/f3de2677528f8e58684d44dcbc1a2782af62660a) Thanks [@Siegrift](https://github.com/Siegrift)! - Pin axios version for e2e tests to pass

## 0.9.0

### Minor Changes

- 488a717e: Bump @api3/ois to 1.1.2 with necessary zod version bump
- 6327dd7d: Bump @api3/ois to 1.2.0 with necessary zod version bump

## 0.8.0

### Minor Changes

- b799a215: Add authorizations configuration to config.json
- c7d689e7: Add authorizer type to config.json
- 115c13db: Use @api3/ois package and remove @api3/airnode-ois
- e34bfb8e: Link monorepo packages using project references

### Patch Changes

- ffba0579: Implement relayRequestId security scheme and use it in the the relay security schemes example integration
- eade375b: callApi handler argument refactor

## 0.7.1

### Patch Changes

- [`2c7fa21b`](https://github.com/api3dao/airnode/commit/2c7fa21b68c3c36bc2b6d4c66b5f7afffc337555) Thanks [@aquarat](https://github.com/aquarat)! - Bump patch version

- Updated dependencies [[`2c7fa21b`](https://github.com/api3dao/airnode/commit/2c7fa21b68c3c36bc2b6d4c66b5f7afffc337555)]:
  - @api3/airnode-ois@0.7.1

## 0.7.0

### Minor Changes

- [#1102](https://github.com/api3dao/airnode/pull/1102) [`09d01d0b`](https://github.com/api3dao/airnode/commit/09d01d0bcc8856eab6ecd60b0ca59a0119a71468) Thanks [@acenolaza](https://github.com/acenolaza)! - Moves securityScheme reference check to airnode-validator package

* [#1140](https://github.com/api3dao/airnode/pull/1140) [`b0771eb7`](https://github.com/api3dao/airnode/commit/b0771eb73b49a1f520ecd86aa254c0d3b2f8f5a2) Thanks [@amarthadan](https://github.com/amarthadan)! - Use zod generated schema TS types instead of custom ones

- [#1159](https://github.com/api3dao/airnode/pull/1159) [`260faa11`](https://github.com/api3dao/airnode/commit/260faa1104ee5170c8a884ddde02702b83cb6a85) Thanks [@Siegrift](https://github.com/Siegrift)! - Use default endpoint values, improve validation

* [#1089](https://github.com/api3dao/airnode/pull/1089) [`70dafa57`](https://github.com/api3dao/airnode/commit/70dafa575bc33c90823c0de83ea51c7d50788c9e) Thanks [@Siegrift](https://github.com/Siegrift)! - Support TS project references

- [#1126](https://github.com/api3dao/airnode/pull/1126) [`6427dc79`](https://github.com/api3dao/airnode/commit/6427dc797bef286ae9ea2d2cf1a3d01b315e143f) Thanks [@Siegrift](https://github.com/Siegrift)! - Allow parameters with same name, but different location

* [#1238](https://github.com/api3dao/airnode/pull/1238) [`982803f7`](https://github.com/api3dao/airnode/commit/982803f74af8a4de78390bc9a2881ba889257d8e) Thanks [@Siegrift](https://github.com/Siegrift)! - Change max response size to 16384 bytes

- [`415a2248`](https://github.com/api3dao/airnode/commit/415a224816bf6edf4ee8a8d6cae60d6e3302c161) Thanks [@aquarat](https://github.com/aquarat)! - Bump minor version for all packages

### Patch Changes

- [#1158](https://github.com/api3dao/airnode/pull/1158) [`e42aa310`](https://github.com/api3dao/airnode/commit/e42aa3101d35f7968443ed166f57ae653e754095) Thanks [@Siegrift](https://github.com/Siegrift)! - Improve TS project references structure, fix published files for airnode-examples

- Updated dependencies [[`e42aa310`](https://github.com/api3dao/airnode/commit/e42aa3101d35f7968443ed166f57ae653e754095), [`1c41ae78`](https://github.com/api3dao/airnode/commit/1c41ae78a1db8976730f28f8231b62bd1b4e883c), [`f6e6c15b`](https://github.com/api3dao/airnode/commit/f6e6c15be081938e4c6c10fd56bd3ee928457d6f), [`b0771eb7`](https://github.com/api3dao/airnode/commit/b0771eb73b49a1f520ecd86aa254c0d3b2f8f5a2), [`0561f407`](https://github.com/api3dao/airnode/commit/0561f407dc379ed10bb2ed6ef7eaf064a5a1c09a), [`d5c9dde6`](https://github.com/api3dao/airnode/commit/d5c9dde6cd1c5ff25e05014ea05573c297350be0), [`70dafa57`](https://github.com/api3dao/airnode/commit/70dafa575bc33c90823c0de83ea51c7d50788c9e), [`c4873921`](https://github.com/api3dao/airnode/commit/c4873921949a29afcd0b5a85c33b615779845325), [`415a2248`](https://github.com/api3dao/airnode/commit/415a224816bf6edf4ee8a8d6cae60d6e3302c161)]:
  - @api3/airnode-ois@0.7.0

## 0.6.0

### Minor Changes

- [`048a4c83`](https://github.com/api3dao/airnode/commit/048a4c830151947c4869cde9b6d5a7f67a606c31) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

### Patch Changes

- Updated dependencies [[`048a4c83`](https://github.com/api3dao/airnode/commit/048a4c830151947c4869cde9b6d5a7f67a606c31)]:
  - @api3/airnode-ois@0.6.0

## 0.5.0

### Minor Changes

- [`2accfc98`](https://github.com/api3dao/airnode/commit/2accfc98470f72f8463a4e80b01150ff4a0b2312) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

* [#835](https://github.com/api3dao/airnode/pull/835) [`b186009f`](https://github.com/api3dao/airnode/commit/b186009f8af3f6e58b874741afc7b622663ddd76) Thanks [@Siegrift](https://github.com/Siegrift)! - Redesign airnode-validator and implement a PoC

### Patch Changes

- [#837](https://github.com/api3dao/airnode/pull/837) [`9ab6ea9c`](https://github.com/api3dao/airnode/commit/9ab6ea9c7a5e9d348dd06c6f95efd66aa6061477) Thanks [@vponline](https://github.com/vponline)! - Removes response data from airnode-adapter extraction error message

* [#848](https://github.com/api3dao/airnode/pull/848) [`8d4fd368`](https://github.com/api3dao/airnode/commit/8d4fd36888213cfb3866f328250946bb4c9f3028) Thanks [@Siegrift](https://github.com/Siegrift)! - Use the same version of dependencies across packages

- [#818](https://github.com/api3dao/airnode/pull/818) [`3a94a49c`](https://github.com/api3dao/airnode/commit/3a94a49cbf7e7e620bcf0d8212a5efcfaab066a2) Thanks [@vponline](https://github.com/vponline)! - Add more detailed errors for airnode responses

- Updated dependencies [[`2accfc98`](https://github.com/api3dao/airnode/commit/2accfc98470f72f8463a4e80b01150ff4a0b2312), [`b186009f`](https://github.com/api3dao/airnode/commit/b186009f8af3f6e58b874741afc7b622663ddd76)]:
  - @api3/airnode-ois@0.5.0

## 0.4.1

### Patch Changes

- [`46aae23d`](https://github.com/api3dao/airnode/commit/46aae23d820cc7efa26e0295c7b94f0a1885a1cc) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

- Updated dependencies [[`46aae23d`](https://github.com/api3dao/airnode/commit/46aae23d820cc7efa26e0295c7b94f0a1885a1cc)]:
  - @api3/airnode-ois@0.4.1

## 0.4.0

### Minor Changes

- [#787](https://github.com/api3dao/airnode/pull/787) [`d4a04845`](https://github.com/api3dao/airnode/commit/d4a04845b53c98088ec05ba7a7844f6c37e9d992) Thanks [@Siegrift](https://github.com/Siegrift)! - Implement sponsorAddress and sponsorWalletAddress relay security schemes

* [`2e669ff2`](https://github.com/api3dao/airnode/commit/2e669ff251b7d7d32ab1eb9b234081871879135e) Thanks [@bbenligiray](https://github.com/bbenligiray)! - Release new version

### Patch Changes

- Updated dependencies [[`8abeeedf`](https://github.com/api3dao/airnode/commit/8abeeedf1dd62665a8a68604560c9388581a1cbb), [`d4a04845`](https://github.com/api3dao/airnode/commit/d4a04845b53c98088ec05ba7a7844f6c37e9d992), [`2e669ff2`](https://github.com/api3dao/airnode/commit/2e669ff251b7d7d32ab1eb9b234081871879135e)]:
  - @api3/airnode-ois@0.4.0

## 0.3.1

### Patch Changes

- [`f7d66930`](https://github.com/api3dao/airnode/commit/f7d66930c04cc16a25fe4d982f740d2c9f4a483c) Thanks
  [@bbenligiray](https://github.com/bbenligiray)! - Release new version

- Updated dependencies
  [[`f7d66930`](https://github.com/api3dao/airnode/commit/f7d66930c04cc16a25fe4d982f740d2c9f4a483c)]:
  - @api3/airnode-ois@0.3.1

## 0.3.0

### Minor Changes

- [#697](https://github.com/api3dao/airnode/pull/697)
  [`83222d2d`](https://github.com/api3dao/airnode/commit/83222d2dac841dc71404933555894f24aefa432a) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Replace relay metadata for relay security schemes

* [#620](https://github.com/api3dao/airnode/pull/620)
  [`606b6e0f`](https://github.com/api3dao/airnode/commit/606b6e0f293958e0bf1168927e3f81a7c2dbb5a3) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Implement new values for "\_type" reserved parameter (address, bytes,
  string, string32 and arrays)

- [#673](https://github.com/api3dao/airnode/pull/673)
  [`a27a42f5`](https://github.com/api3dao/airnode/commit/a27a42f5d72ef30c0ef87d64ba338732f3d0ef4b) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Implement reserved parameter escaping

* Release new version

- [#669](https://github.com/api3dao/airnode/pull/669)
  [`da698d19`](https://github.com/api3dao/airnode/commit/da698d194038cb4c6b5b9c1b35316b9870146d15) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Support multiple values for Airnode responses

* [#674](https://github.com/api3dao/airnode/pull/674)
  [`1b7e116f`](https://github.com/api3dao/airnode/commit/1b7e116f68240857f572eb328f4417fdb0d07b47) Thanks
  [@Siegrift](https://github.com/Siegrift)! - Support "timestamp" value in "\_type" parameter

### Patch Changes

- Updated dependencies
  [[`83222d2d`](https://github.com/api3dao/airnode/commit/83222d2dac841dc71404933555894f24aefa432a)]:
  - @api3/airnode-ois@0.3.0

## 0.2.2

### Patch Changes

- Release new version

- Updated dependencies []:
  - @api3/airnode-ois@0.2.2

## 0.2.1

### Patch Changes

- Packages published again with npm v8

- Updated dependencies []:
  - @api3/airnode-ois@0.2.1

## 0.2.0

### Minor Changes

- [#639](https://github.com/api3dao/airnode/pull/639)
  [`f1c10185`](https://github.com/api3dao/airnode/commit/f1c10185498d9bafe799661ecd9e361a2c9ea55d) Thanks
  [@Siegrift](https://github.com/Siegrift)! - See https://medium.com/api3/beyond-pre-alpha-rrp-88717e9ed22d for a
  summary of the changes since the pre-alpha version

### Patch Changes

- Updated dependencies
  [[`f1c10185`](https://github.com/api3dao/airnode/commit/f1c10185498d9bafe799661ecd9e361a2c9ea55d)]:
  - @api3/airnode-ois@0.2.0
