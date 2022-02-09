# @api3/airnode-node

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
