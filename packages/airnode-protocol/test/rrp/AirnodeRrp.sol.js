/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let airnodeRrp, rrpRequester;
let airnodeAddress, airnodeMnemonic, airnodeXpub, airnodeWallet;
let sponsorWalletAddress;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    sponsor: accounts[1],
    randomPerson: accounts[9],
  };
  const airnodeRrpFactory = await hre.ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const rrpRequesterFactory = await hre.ethers.getContractFactory('MockRrpRequester', roles.deployer);
  rrpRequester = await rrpRequesterFactory.deploy(airnodeRrp.address);
  ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = testUtils.generateRandomAirnodeWallet());
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
  sponsorWalletAddress = testUtils.deriveSponsorWalletAddress(airnodeXpub, roles.sponsor.address);
  await roles.deployer.sendTransaction({
    to: airnodeAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
  await roles.deployer.sendTransaction({
    to: sponsorWalletAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
});

describe('setSponsorshipStatus', function () {
  context('Requester address not zero', function () {
    it('sets sponsorship status', async function () {
      expect(
        await airnodeRrp.sponsorToRequesterToSponsorshipStatus(roles.sponsor.address, rrpRequester.address)
      ).to.equal(false);
      expect(await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).to.equal(1);
      // Set sponsorship status as true
      await expect(airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true))
        .to.emit(airnodeRrp, 'SetSponsorshipStatus')
        .withArgs(roles.sponsor.address, rrpRequester.address, true);
      expect(
        await airnodeRrp.sponsorToRequesterToSponsorshipStatus(roles.sponsor.address, rrpRequester.address)
      ).to.equal(true);
      expect(await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).to.equal(1);
      // Reset sponsorship status back as false
      await expect(airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, false))
        .to.emit(airnodeRrp, 'SetSponsorshipStatus')
        .withArgs(roles.sponsor.address, rrpRequester.address, false);
      expect(
        await airnodeRrp.sponsorToRequesterToSponsorshipStatus(roles.sponsor.address, rrpRequester.address)
      ).to.equal(false);
      expect(await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).to.equal(1);
    });
  });
  context('Requester address zero', function () {
    it('reverts', async function () {
      await expect(
        airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(hre.ethers.constants.AddressZero, true)
      ).to.be.revertedWith('Requester address zero');
    });
  });
});

describe('makeTemplateRequest', function () {
  context('Template exists', function () {
    context('Requester sponsored', function () {
      it('makes template request', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Create the template
        const endpointId = testUtils.generateRandomBytes32();
        const parameters = testUtils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Compute the expected request ID
        const requesterRequestCount = await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address);
        const chainId = (await hre.ethers.provider.getNetwork()).chainId;
        const requestTimeParameters = testUtils.generateRandomBytes();
        const expectedRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              chainId,
              airnodeRrp.address,
              rrpRequester.address,
              requesterRequestCount,
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters,
            ]
          )
        );
        // Make the request
        expect(await airnodeRrp.requestIsAwaitingFulfillment(expectedRequestId)).to.equal(false);
        await expect(
          rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            )
        )
          .to.emit(airnodeRrp, 'MadeTemplateRequest')
          .withArgs(
            airnodeAddress,
            expectedRequestId,
            requesterRequestCount,
            chainId,
            rrpRequester.address,
            templateId,
            roles.sponsor.address,
            sponsorWalletAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        expect(await airnodeRrp.requestIsAwaitingFulfillment(expectedRequestId)).to.equal(true);
        expect(await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).to.equal(
          requesterRequestCount.add(1)
        );
      });
    });
    context('Requester not sponsored', function () {
      it('reverts', async function () {
        // Create the template
        const endpointId = testUtils.generateRandomBytes32();
        const parameters = testUtils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        const requestTimeParameters = testUtils.generateRandomBytes();
        await expect(
          rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            )
        ).to.be.revertedWith('Requester not sponsored');
      });
    });
  });
  context('Template does not exist', function () {
    it('reverts', async function () {
      const templateId = testUtils.generateRandomBytes32();
      const requestTimeParameters = testUtils.generateRandomBytes();
      await expect(
        rrpRequester
          .connect(roles.randomPerson)
          .makeTemplateRequest(
            templateId,
            roles.sponsor.address,
            sponsorWalletAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          )
      ).to.be.revertedWith('Template does not exist');
    });
  });
});

describe('makeFullRequest', function () {
  context('Airnode address not zero', function () {
    context('Requester sponsored', function () {
      it('makes template request', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Compute the expected request ID
        const requesterRequestCount = await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address);
        const chainId = (await hre.ethers.provider.getNetwork()).chainId;
        const endpointId = testUtils.generateRandomBytes32();
        const requestTimeParameters = testUtils.generateRandomBytes();
        const expectedRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            [
              'uint256',
              'address',
              'address',
              'uint256',
              'address',
              'bytes32',
              'address',
              'address',
              'address',
              'bytes4',
              'bytes',
            ],
            [
              chainId,
              airnodeRrp.address,
              rrpRequester.address,
              requesterRequestCount,
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters,
            ]
          )
        );
        // Make the request
        expect(await airnodeRrp.requestIsAwaitingFulfillment(expectedRequestId)).to.equal(false);
        await expect(
          rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            )
        )
          .to.emit(airnodeRrp, 'MadeFullRequest')
          .withArgs(
            airnodeAddress,
            expectedRequestId,
            requesterRequestCount,
            chainId,
            rrpRequester.address,
            endpointId,
            roles.sponsor.address,
            sponsorWalletAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        expect(await airnodeRrp.requestIsAwaitingFulfillment(expectedRequestId)).to.equal(true);
        expect(await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).to.equal(
          requesterRequestCount.add(1)
        );
      });
    });
    context('Requester not sponsored', function () {
      it('reverts', async function () {
        const endpointId = testUtils.generateRandomBytes32();
        const requestTimeParameters = testUtils.generateRandomBytes();
        await expect(
          rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            )
        ).to.be.revertedWith('Requester not sponsored');
      });
    });
  });
  context('Airnode address zero', function () {
    it('reverts', async function () {
      // Endorse the requester
      await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
      const endpointId = testUtils.generateRandomBytes32();
      const requestTimeParameters = testUtils.generateRandomBytes();
      // Make the request
      await expect(
        rrpRequester
          .connect(roles.randomPerson)
          .makeFullRequest(
            hre.ethers.constants.AddressZero,
            endpointId,
            roles.sponsor.address,
            sponsorWalletAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          )
      ).to.be.revertedWith('Airnode address zero');
    });
  });
});

describe('fulfill', function () {
  context('Template request made', function () {
    context('Sender is sponsor wallet', function () {
      context('Fulfillment parameters are correct', function () {
        context('Signature is valid', function () {
          context('Fulfill function does not revert', function () {
            it('returns `true` and fulfills', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
              // Create the template
              const endpointId = testUtils.generateRandomBytes32();
              const parameters = testUtils.generateRandomBytes();
              await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
              const templateId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
              );
              // Make the request
              const requestTimeParameters = testUtils.generateRandomBytes();
              await rrpRequester
                .connect(roles.randomPerson)
                .makeTemplateRequest(
                  templateId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  requestTimeParameters,
                  { gasLimit: 500000 }
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpRequester.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                    templateId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(true);
              expect(staticCallResult.callData).to.equal('0x');
              // Fulfill the request
              expect(await airnodeRrp.requestIsAwaitingFulfillment(requestId)).to.equal(true);
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FulfilledRequest')
                .withArgs(airnodeAddress, requestId, fulfillData);
              expect(await airnodeRrp.requestIsAwaitingFulfillment(requestId)).to.equal(false);
              expect(await rrpRequester.requestIdToData(requestId)).to.equal(fulfillData);
              // Attempt to fulfill the request a second time
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.be.revertedWith('Invalid request fulfillment');
            });
          });
          context('Fulfill function reverts with string', function () {
            it('returns `false` and the revert string and fails', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
              // Create the template
              const endpointId = testUtils.generateRandomBytes32();
              const parameters = testUtils.generateRandomBytes();
              await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
              const templateId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
              );
              // Make the request
              const requestTimeParameters = testUtils.generateRandomBytes();
              await rrpRequester
                .connect(roles.randomPerson)
                .makeTemplateRequest(
                  templateId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                  requestTimeParameters
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpRequester.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                    templateId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              // Returns false because the target function always reverts
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Always reverts');
              // Fulfill the request (which will emit a failed event)
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FailedRequest')
                .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
              expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
              // Attempt to fulfill the request a second time
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.be.revertedWith('Invalid request fulfillment');
            });
          });
          context('Fulfill function reverts with string v2', function () {
            it('returns `false` and the revert string and fails', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.randomPerson.address, true);
              // Create the template
              const endpointId = testUtils.generateRandomBytes32();
              const parameters = testUtils.generateRandomBytes();
              await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
              const templateId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
              );
              // Make the request
              const requestTimeParameters = testUtils.generateRandomBytes();
              await airnodeRrp
                .connect(roles.randomPerson)
                .makeTemplateRequest(
                  templateId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  requestTimeParameters
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    roles.randomPerson.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(roles.randomPerson.address)).sub(1),
                    templateId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              // Returns false because the requester was not expecting the fulfillment
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No such request made');
              // Fulfill the request (which will emit a failed event)
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FailedRequest')
                .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
              expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
            });
          });
          context('Fulfill function reverts without string', function () {
            it('returns `false` and no revert string and fails', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
              // Create the template
              const endpointId = testUtils.generateRandomBytes32();
              const parameters = testUtils.generateRandomBytes();
              await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
              const templateId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
              );
              // Make the request
              const requestTimeParameters = testUtils.generateRandomBytes();
              await rrpRequester
                .connect(roles.randomPerson)
                .makeTemplateRequest(
                  templateId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                  requestTimeParameters
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpRequester.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                    templateId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              // Returns false because the target function always reverts
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
              // Fulfill the request (which will emit a failed event)
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FailedRequest')
                .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
              expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
              // Attempt to fulfill the request a second time
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.be.revertedWith('Invalid request fulfillment');
            });
          });
          context('Fulfill function does not return', function () {
            it('returns `false` and no revert string and fails', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
              // Create the template
              const endpointId = testUtils.generateRandomBytes32();
              const parameters = testUtils.generateRandomBytes();
              await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
              const templateId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
              );
              // Make the request
              const requestTimeParameters = testUtils.generateRandomBytes();
              await rrpRequester
                .connect(roles.randomPerson)
                .makeTemplateRequest(
                  templateId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                  requestTimeParameters
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpRequester.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                    templateId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              // Returns false because the target function always reverts
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
              // Fulfill the request (which will emit a failed event)
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FailedRequest')
                .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
              expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
            });
          });
        });
        context('Signature is invalid', function () {
          it('reverts', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
            // Create the template
            const endpointId = testUtils.generateRandomBytes32();
            const parameters = testUtils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            // Make the request
            const requestTimeParameters = testUtils.generateRandomBytes();
            await rrpRequester
              .connect(roles.randomPerson)
              .makeTemplateRequest(
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters
              );
            const requestId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                [
                  'uint256',
                  'address',
                  'address',
                  'uint256',
                  'bytes32',
                  'address',
                  'address',
                  'address',
                  'bytes4',
                  'bytes',
                ],
                [
                  (await hre.ethers.provider.getNetwork()).chainId,
                  airnodeRrp.address,
                  rrpRequester.address,
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  templateId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  requestTimeParameters,
                ]
              )
            );
            // Attempt to fulfill the request
            const sponsorWallet = testUtils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            const invalidSignature1 = await airnodeWallet.signMessage(
              hre.ethers.utils.arrayify(
                hre.ethers.utils.keccak256(
                  hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [hre.ethers.constants.HashZero, fulfillData])
                )
              )
            );
            const invalidSignature2 = await airnodeWallet.signMessage(
              hre.ethers.utils.arrayify(
                hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, '0x123456']))
              )
            );
            const invalidSignature3 = '0x123456';
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  invalidSignature1,
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Signature mismatch');
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  invalidSignature2,
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Signature mismatch');
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  invalidSignature3,
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('ECDSA: invalid signature length');
          });
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
            )
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                fulfillData,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Airnode address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
            )
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                hre.ethers.constants.AddressZero,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                fulfillData,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
            )
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                hre.ethers.constants.AddressZero,
                rrpRequester.interface.getSighash('fulfill'),
                fulfillData,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
            )
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(requestId, airnodeAddress, rrpRequester.address, '0x00000000', fulfillData, signature, {
                gasLimit: 500000,
              })
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Sender not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Create the template
        const endpointId = testUtils.generateRandomBytes32();
        const parameters = testUtils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Make the request
        const requestTimeParameters = testUtils.generateRandomBytes();
        await rrpRequester
          .connect(roles.randomPerson)
          .makeTemplateRequest(
            templateId,
            roles.sponsor.address,
            sponsorWalletAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpRequester.address,
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fulfill the request
        const fulfillData = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
        );
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
          )
        );
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fulfill(
              requestId,
              airnodeAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              fulfillData,
              signature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Invalid request fulfillment');
      });
    });
  });
  context('Full request made', function () {
    context('Sender is sponsor wallet', function () {
      context('Fulfillment parameters are correct', function () {
        context('Signature is valid', function () {
          context('Fulfill function does not revert', function () {
            it('returns `true` and fulfills', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
              // Make the request
              const endpointId = testUtils.generateRandomBytes32();
              const requestTimeParameters = testUtils.generateRandomBytes();
              await rrpRequester
                .connect(roles.randomPerson)
                .makeFullRequest(
                  airnodeAddress,
                  endpointId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  requestTimeParameters
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'address',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpRequester.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                    airnodeAddress,
                    endpointId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(true);
              expect(staticCallResult.callData).to.equal('0x');
              // Fulfill the request
              expect(await airnodeRrp.requestIsAwaitingFulfillment(requestId)).to.equal(true);
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FulfilledRequest')
                .withArgs(airnodeAddress, requestId, fulfillData);
              expect(await airnodeRrp.requestIsAwaitingFulfillment(requestId)).to.equal(false);
              expect(await rrpRequester.requestIdToData(requestId)).to.equal(fulfillData);
              // Attempt to fulfill the request a second time
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.be.revertedWith('Invalid request fulfillment');
            });
          });
          context('Fulfill function reverts with string', function () {
            it('returns `false` and the revert string and fails', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
              // Make the request
              const endpointId = testUtils.generateRandomBytes32();
              const requestTimeParameters = testUtils.generateRandomBytes();
              await rrpRequester
                .connect(roles.randomPerson)
                .makeFullRequest(
                  airnodeAddress,
                  endpointId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                  requestTimeParameters
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'address',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpRequester.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                    airnodeAddress,
                    endpointId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              // Returns false because the target function always reverts
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Always reverts');
              // Fulfill the request (which will emit a failed event)
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FailedRequest')
                .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
              expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
              // Attempt to fulfill the request a second time
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.be.revertedWith('Invalid request fulfillment');
            });
          });
          context('Fulfill function reverts with string v2', function () {
            it('returns `false` and the revert string and fails', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.randomPerson.address, true);
              // Make the request
              const endpointId = testUtils.generateRandomBytes32();
              const requestTimeParameters = testUtils.generateRandomBytes();
              await airnodeRrp
                .connect(roles.randomPerson)
                .makeFullRequest(
                  airnodeAddress,
                  endpointId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  requestTimeParameters
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'address',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    roles.randomPerson.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(roles.randomPerson.address)).sub(1),
                    airnodeAddress,
                    endpointId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              // Returns false because the requester was not expecting the fulfillment
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No such request made');
              // Fulfill the request (which will emit a failed event)
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfill'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FailedRequest')
                .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
              expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
            });
          });
          context('Fulfill function reverts without string', function () {
            it('returns `false` and no revert string and fails', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
              // Make the request
              const endpointId = testUtils.generateRandomBytes32();
              const requestTimeParameters = testUtils.generateRandomBytes();
              await rrpRequester
                .connect(roles.randomPerson)
                .makeFullRequest(
                  airnodeAddress,
                  endpointId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                  requestTimeParameters
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'address',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpRequester.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                    airnodeAddress,
                    endpointId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              // Returns false because the target function always reverts
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
              // Fulfill the request (which will emit a failed event)
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FailedRequest')
                .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
              expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
              // Attempt to fulfill the request a second time
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.be.revertedWith('Invalid request fulfillment');
            });
          });
          context('Fulfill function does not return', function () {
            it('returns `false` and no revert string and fails', async function () {
              // Endorse the requester
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
              // Make the request
              const endpointId = testUtils.generateRandomBytes32();
              const requestTimeParameters = testUtils.generateRandomBytes();
              await rrpRequester
                .connect(roles.randomPerson)
                .makeFullRequest(
                  airnodeAddress,
                  endpointId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                  requestTimeParameters
                );
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'address',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpRequester.address,
                    (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                    airnodeAddress,
                    endpointId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                    requestTimeParameters,
                  ]
                )
              );
              const sponsorWallet = testUtils
                .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
                .connect(hre.ethers.provider);
              const fulfillData = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData])
                  )
                )
              );
              // Make static call to check fulfillment result
              // Returns false because the target function always reverts
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                  fulfillData,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
              // Fulfill the request (which will emit a failed event)
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpRequester.address,
                    rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                    fulfillData,
                    signature,
                    { gasLimit: 500000 }
                  )
              )
                .to.emit(airnodeRrp, 'FailedRequest')
                .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
              expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
            });
          });
        });
        context('Signature is invalid', function () {
          it('reverts', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
            // Make the request
            const endpointId = testUtils.generateRandomBytes32();
            const requestTimeParameters = testUtils.generateRandomBytes();
            await rrpRequester
              .connect(roles.randomPerson)
              .makeFullRequest(
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters
              );
            const requestId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                [
                  'uint256',
                  'address',
                  'address',
                  'uint256',
                  'address',
                  'bytes32',
                  'address',
                  'address',
                  'address',
                  'bytes4',
                  'bytes',
                ],
                [
                  (await hre.ethers.provider.getNetwork()).chainId,
                  airnodeRrp.address,
                  rrpRequester.address,
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  airnodeAddress,
                  endpointId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  requestTimeParameters,
                ]
              )
            );
            // Attempt to fulfill the request
            const sponsorWallet = testUtils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            const invalidSignature1 = await airnodeWallet.signMessage(
              hre.ethers.utils.arrayify(
                hre.ethers.utils.keccak256(
                  hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [hre.ethers.constants.HashZero, fulfillData])
                )
              )
            );
            const invalidSignature2 = await airnodeWallet.signMessage(
              hre.ethers.utils.arrayify(
                hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, '0x123456']))
              )
            );
            const invalidSignature3 = '0x123456';
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  invalidSignature1,
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Signature mismatch');
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  invalidSignature2,
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Signature mismatch');
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
                  fulfillData,
                  invalidSignature3,
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('ECDSA: invalid signature length');
          });
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = testUtils.generateRandomBytes32();
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'address',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
            )
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                fulfillData,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Airnode address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = testUtils.generateRandomBytes32();
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'address',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
            )
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                hre.ethers.constants.AddressZero,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                fulfillData,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = testUtils.generateRandomBytes32();
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'address',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
            )
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                hre.ethers.constants.AddressZero,
                rrpRequester.interface.getSighash('fulfill'),
                fulfillData,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = testUtils.generateRandomBytes32();
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'address',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
            )
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(requestId, airnodeAddress, rrpRequester.address, '0x00000000', fulfillData, signature, {
                gasLimit: 500000,
              })
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Sender not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Make the request
        const endpointId = testUtils.generateRandomBytes32();
        const requestTimeParameters = testUtils.generateRandomBytes();
        await rrpRequester
          .connect(roles.randomPerson)
          .makeFullRequest(
            airnodeAddress,
            endpointId,
            roles.sponsor.address,
            sponsorWalletAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            [
              'uint256',
              'address',
              'address',
              'uint256',
              'address',
              'bytes32',
              'address',
              'address',
              'address',
              'bytes4',
              'bytes',
            ],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpRequester.address,
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fulfill the request
        const fulfillData = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
        );
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
          )
        );
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fulfill(
              requestId,
              airnodeAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              fulfillData,
              signature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Invalid request fulfillment');
      });
    });
  });
});

describe('fail', function () {
  context('Template request made', function () {
    context('Sender is sponsor wallet', function () {
      context('Fulfillment parameters are correct', function () {
        it('fails successfully', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          expect(await airnodeRrp.requestIsAwaitingFulfillment(requestId)).to.equal(true);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                {
                  gasLimit: 500000,
                }
              )
          )
            .to.emit(airnodeRrp, 'FailedRequest')
            .withArgs(airnodeAddress, requestId, errorMessage);
          expect(await airnodeRrp.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
          // Attempt to fail the request a second time
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                {
                  gasLimit: 500000,
                }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          // Attempt to fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Airnode address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                hre.ethers.constants.AddressZero,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                hre.ethers.constants.AddressZero,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(requestId, airnodeAddress, rrpRequester.address, '0x00000000', errorMessage, { gasLimit: 500000 })
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Sender not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Create the template
        const endpointId = testUtils.generateRandomBytes32();
        const parameters = testUtils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Make the request
        const requestTimeParameters = testUtils.generateRandomBytes();
        await rrpRequester
          .connect(roles.randomPerson)
          .makeTemplateRequest(
            templateId,
            roles.sponsor.address,
            sponsorWalletAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpRequester.address,
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fail the request
        const errorMessage = 'The revert string bubbled up from fulfill()';
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fail(
              requestId,
              airnodeAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              errorMessage,
              {
                gasLimit: 500000,
              }
            )
        ).to.be.revertedWith('Invalid request fulfillment');
      });
    });
  });
  context('Full request made', function () {
    context('Sender is sponsor wallet', function () {
      context('Fulfillment parameters are correct', function () {
        it('fails successfully', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = testUtils.generateRandomBytes32();
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'address',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          expect(await airnodeRrp.requestIsAwaitingFulfillment(requestId)).to.equal(true);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                {
                  gasLimit: 500000,
                }
              )
          )
            .to.emit(airnodeRrp, 'FailedRequest')
            .withArgs(airnodeAddress, requestId, errorMessage);
          expect(await airnodeRrp.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
          // Attempt to fulfill the request a second time
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                {
                  gasLimit: 500000,
                }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = testUtils.generateRandomBytes32();
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          // Attempt to fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Airnode address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = testUtils.generateRandomBytes32();
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'address',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                hre.ethers.constants.AddressZero,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = testUtils.generateRandomBytes32();
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'address',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                hre.ethers.constants.AddressZero,
                rrpRequester.interface.getSighash('fulfill'),
                errorMessage,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = testUtils.generateRandomBytes32();
          const requestTimeParameters = testUtils.generateRandomBytes();
          await rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'address',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpRequester.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = testUtils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const errorMessage = 'The revert string bubbled up from fulfill()';
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(requestId, airnodeAddress, rrpRequester.address, '0x00000000', errorMessage, { gasLimit: 500000 })
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Sender not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Make the request
        const endpointId = testUtils.generateRandomBytes32();
        const requestTimeParameters = testUtils.generateRandomBytes();
        await rrpRequester
          .connect(roles.randomPerson)
          .makeFullRequest(
            airnodeAddress,
            endpointId,
            roles.sponsor.address,
            sponsorWalletAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            [
              'uint256',
              'address',
              'address',
              'uint256',
              'address',
              'bytes32',
              'address',
              'address',
              'address',
              'bytes4',
              'bytes',
            ],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpRequester.address,
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fail the request
        const errorMessage = 'The revert string bubbled up from fulfill()';
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fail(
              requestId,
              airnodeAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              errorMessage,
              {
                gasLimit: 500000,
              }
            )
        ).to.be.revertedWith('Invalid request fulfillment');
      });
    });
  });
});

describe('verifyData', function () {
  context('Template exists', function () {
    context('Signature valid', function () {
      context('Signature correct', function () {
        it('returns request hash and Airnode address', async function () {
          // Create the template
          const endpointId = testUtils.generateRandomBytes32();
          const parameters = testUtils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          const requestTimeParameters = testUtils.generateRandomBytes();
          const requestHash = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, requestTimeParameters])
          );
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestHash, fulfillData])
              )
            )
          );
          const staticCallResponse = await airnodeRrp.verifyData(
            templateId,
            requestTimeParameters,
            fulfillData,
            signature
          );
          expect(staticCallResponse.airnode).to.equal(airnodeAddress);
          expect(staticCallResponse.requestHash).to.equal(requestHash);
        });
      });
      context('Signature incorrect', function () {
        context('Template ID mismatch', function () {
          it('reverts', async function () {
            // Create the template
            const endpointId = testUtils.generateRandomBytes32();
            const parameters = testUtils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            const requestTimeParameters = testUtils.generateRandomBytes();
            const requestHash = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'bytes'],
                [testUtils.generateRandomBytes32(), requestTimeParameters]
              )
            );
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            const signature = await airnodeWallet.signMessage(
              hre.ethers.utils.arrayify(
                hre.ethers.utils.keccak256(
                  hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestHash, fulfillData])
                )
              )
            );
            await expect(
              airnodeRrp.verifyData(templateId, requestTimeParameters, fulfillData, signature)
            ).to.be.revertedWith('Signature mismatch');
          });
        });
        context('Request time parameters mismatch', function () {
          it('reverts', async function () {
            // Create the template
            const endpointId = testUtils.generateRandomBytes32();
            const parameters = testUtils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            const requestTimeParameters = testUtils.generateRandomBytes();
            const requestHash = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestHash, testUtils.generateRandomBytes()])
            );
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            const signature = await airnodeWallet.signMessage(
              hre.ethers.utils.arrayify(
                hre.ethers.utils.keccak256(
                  hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestHash, fulfillData])
                )
              )
            );
            await expect(
              airnodeRrp.verifyData(templateId, requestTimeParameters, fulfillData, signature)
            ).to.be.revertedWith('Signature mismatch');
          });
        });
        context('Fulfillment data mismatch', function () {
          it('reverts', async function () {
            // Create the template
            const endpointId = testUtils.generateRandomBytes32();
            const parameters = testUtils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            const requestTimeParameters = testUtils.generateRandomBytes();
            const requestHash = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestHash, requestTimeParameters])
            );
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            const signature = await airnodeWallet.signMessage(
              hre.ethers.utils.arrayify(
                hre.ethers.utils.keccak256(
                  hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestHash, fulfillData])
                )
              )
            );
            await expect(
              airnodeRrp.verifyData(templateId, requestTimeParameters, testUtils.generateRandomBytes(), signature)
            ).to.be.revertedWith('Signature mismatch');
          });
        });
      });
    });
    context('Signature invalid', function () {
      it('reverts', async function () {
        // Create the template
        const endpointId = testUtils.generateRandomBytes32();
        const parameters = testUtils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        await expect(
          airnodeRrp.verifyData(
            templateId,
            testUtils.generateRandomBytes(),
            testUtils.generateRandomBytes(),
            '0x12345678'
          )
        ).to.be.revertedWith('ECDSA: invalid signature length');
        await expect(
          airnodeRrp.verifyData(
            templateId,
            testUtils.generateRandomBytes(),
            testUtils.generateRandomBytes(),
            `0x${'0'.repeat(65 * 2)}`
          )
        ).to.be.revertedWith("ECDSA: invalid signature 'v' value");
        // The point is that ECDSA.sol can revert in different ways, not checking them all
      });
    });
  });
  context('Template does not exist', function () {
    it('reverts', async function () {
      await expect(
        airnodeRrp.verifyData(
          testUtils.generateRandomBytes32(),
          testUtils.generateRandomBytes(),
          testUtils.generateRandomBytes(),
          testUtils.generateRandomBytes()
        )
      ).to.be.revertedWith('Template does not exist');
    });
  });
});
