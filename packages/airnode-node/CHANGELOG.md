# @api3/airnode-node

## 0.6.3

### Patch Changes

- [`5659bea9`](https://github.com/api3dao/airnode/commit/5659bea9980a72c06bf00c41584fde6670efdaec) Thanks [@aquarat](https://github.com/aquarat)! - Bump patch version

- Updated dependencies [[`5659bea9`](https://github.com/api3dao/airnode/commit/5659bea9980a72c06bf00c41584fde6670efdaec)]:
  - @api3/airnode-abi@0.6.3
  - @api3/airnode-adapter@0.6.3
  - @api3/airnode-ois@0.6.3
  - @api3/airnode-protocol@0.6.3
  - @api3/airnode-utilities@0.6.3
  - @api3/airnode-validator@0.6.3

## 0.6.2

### Patch Changes

- Bump patch version

- Updated dependencies []:
  - @api3/airnode-abi@0.6.2
  - @api3/airnode-adapter@0.6.2
  - @api3/airnode-ois@0.6.2
  - @api3/airnode-protocol@0.6.2
  - @api3/airnode-utilities@0.6.2
  - @api3/airnode-validator@0.6.2

## 0.6.1

### Patch Changes

- [#1055](https://github.com/api3dao/airnode/pull/1055) [`dcf8cebb`](https://github.com/api3dao/airnode/commit/dcf8cebbc3cc9b2169b1b1c8ff2444b8af715171) Thanks [@amarthadan](https://github.com/amarthadan)! - Remove airnode address from templateId verification

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

* [#937](https://github.com/api3dao/airnode/pull/937) [`b093eb56`](https://github.com/api3dao/airnode/commit/b093eb5666db11892c5d31bb08366c541ab1d41b) Thanks [@dependabot](https://github.com/apps/dependabot)! - Fix tests after ethers version bump

- [#818](https://github.com/api3dao/airnode/pull/818) [`3a94a49c`](https://github.com/api3dao/airnode/commit/3a94a49cbf7e7e620bcf0d8212a5efcfaab066a2) Thanks [@vponline](https://github.com/vponline)! - Add more detailed errors for airnode responses

* [#947](https://github.com/api3dao/airnode/pull/947) [`291f6a45`](https://github.com/api3dao/airnode/commit/291f6a45b2166849608d01bcce0b759978a19843) Thanks [@dependabot](https://github.com/apps/dependabot)! - Fix jest test to improve robustness when changing ethers versions

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
