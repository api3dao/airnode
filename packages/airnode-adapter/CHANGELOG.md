# @api3/airnode-adapter

## 0.10.0

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
