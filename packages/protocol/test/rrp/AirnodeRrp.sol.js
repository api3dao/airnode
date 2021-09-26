/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

let roles;
let airnodeRrp, rrpRequester;
let airnodeAddress, airnodeMnemonic, airnodeXpub;
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
  ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = utils.generateRandomAirnodeWallet());
  sponsorWalletAddress = utils.deriveSponsorWalletAddress(airnodeXpub, roles.sponsor.address);
  await roles.deployer.sendTransaction({
    to: airnodeAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
  await roles.deployer.sendTransaction({
    to: sponsorWalletAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
});

describe('setAirnodeXpub', function () {
  it('sets Airnode public key', async function () {
    const initialPublicKey = await airnodeRrp.airnodeToXpub(airnodeAddress);
    expect(initialPublicKey).to.equal('');
    const airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);
    await expect(airnodeRrp.connect(airnodeWallet).setAirnodeXpub(airnodeXpub, { gasLimit: 500000 }))
      .to.emit(airnodeRrp, 'SetAirnodeXpub')
      .withArgs(airnodeAddress, airnodeXpub);
    const setPublicKey = await airnodeRrp.airnodeToXpub(airnodeAddress);
    expect(setPublicKey).to.equal(airnodeXpub);
  });
});

describe('setSponsorshipStatus', function () {
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

describe('makeTemplateRequest', function () {
  context('Template exists', function () {
    context('Fulfill address not AirnodeRrp', function () {
      context('Requester sponsored', function () {
        it('makes template request', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Compute the expected request ID
          const requesterRequestCount = await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address);
          const chainId = (await hre.ethers.provider.getNetwork()).chainId;
          const requestTimeParameters = utils.generateRandomBytes();
          const expectedRequestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                requesterRequestCount,
                chainId,
                rrpRequester.address,
                templateId,
                roles.sponsor.address,
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
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          const requestTimeParameters = utils.generateRandomBytes();
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
    context('Fulfill address AirnodeRrp', function () {
      it('reverts', async function () {
        // Create the template
        const endpointId = utils.generateRandomBytes32();
        const parameters = utils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        const requestTimeParameters = utils.generateRandomBytes();
        await expect(
          rrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrp.address,
              airnodeRrp.interface.getSighash('fulfill'),
              requestTimeParameters
            )
        ).to.be.revertedWith('Fulfill address AirnodeRrp');
      });
    });
  });
  context('Template does not exist', function () {
    it('reverts', async function () {
      const templateId = utils.generateRandomBytes32();
      const requestTimeParameters = utils.generateRandomBytes();
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
    context('Fulfill address not AirnodeRrp', function () {
      context('Requester sponsored', function () {
        it('makes template request', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Compute the expected request ID
          const requesterRequestCount = await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address);
          const chainId = (await hre.ethers.provider.getNetwork()).chainId;
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          const expectedRequestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                requesterRequestCount,
                chainId,
                rrpRequester.address,
                endpointId,
                roles.sponsor.address,
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
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
    context('Fulfill address AirnodeRrp', function () {
      it('reverts', async function () {
        const endpointId = utils.generateRandomBytes32();
        const requestTimeParameters = utils.generateRandomBytes();
        await expect(
          rrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrp.address,
              airnodeRrp.interface.getSighash('fulfill'),
              requestTimeParameters
            )
        ).to.be.revertedWith('Fulfill address AirnodeRrp');
      });
    });
  });
  context('Airnode address zero', function () {
    it('reverts', async function () {
      // Endorse the requester
      await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
      const endpointId = utils.generateRandomBytes32();
      const requestTimeParameters = utils.generateRandomBytes();
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
    context('Caller is sponsor wallet', function () {
      context('Fulfillment parameters are correct', function () {
        context('Fulfill function does not revert', function () {
          it('returns `true` and fulfills', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
            // Create the template
            const endpointId = utils.generateRandomBytes32();
            const parameters = utils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            // Make the request
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  rrpRequester.address,
                  templateId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
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
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
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
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
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
            const endpointId = utils.generateRandomBytes32();
            const parameters = utils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            // Make the request
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  rrpRequester.address,
                  templateId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            // Returns false because the target function always reverts
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                { gasLimit: 500000 }
              );
            expect(staticCallResult.callSuccess).to.equal(false);
            expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Always reverts');
            // Fulfill the request (which will emit a failed event)
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
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
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
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
            const endpointId = utils.generateRandomBytes32();
            const parameters = utils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            // Make the request
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(roles.randomPerson.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  roles.randomPerson.address,
                  templateId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            // Returns false because the requester was not expecting the fulfillment
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              );
            expect(staticCallResult.callSuccess).to.equal(false);
            expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('No such request made');
            // Fulfill the request (which will emit a failed event)
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
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
            const endpointId = utils.generateRandomBytes32();
            const parameters = utils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            // Make the request
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  rrpRequester.address,
                  templateId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            // Returns false because the target function always reverts
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                { gasLimit: 500000 }
              );
            expect(staticCallResult.callSuccess).to.equal(false);
            expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
            // Fulfill the request (which will emit a failed event)
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
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
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
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
            const endpointId = utils.generateRandomBytes32();
            const parameters = utils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            // Make the request
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  rrpRequester.address,
                  templateId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            // Returns false because the target function always reverts
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                { gasLimit: 500000 }
              );
            expect(staticCallResult.callSuccess).to.equal(false);
            expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
            // Fulfill the request (which will emit a failed event)
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                  { gasLimit: 500000 }
                )
            )
              .to.emit(airnodeRrp, 'FailedRequest')
              .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
            expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
          });
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
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
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
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
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                templateId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                hre.ethers.constants.AddressZero,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
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
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                templateId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                hre.ethers.constants.AddressZero,
                rrpRequester.interface.getSighash('fulfill'),
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
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                templateId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(requestId, airnodeAddress, fulfillData, rrpRequester.address, '0x00000000', {
                gasLimit: 500000,
              })
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Caller not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Create the template
        const endpointId = utils.generateRandomBytes32();
        const parameters = utils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Make the request
        const requestTimeParameters = utils.generateRandomBytes();
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
            ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
            [
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              (await hre.ethers.provider.getNetwork()).chainId,
              rrpRequester.address,
              templateId,
              roles.sponsor.address,
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fulfill the request
        const fulfillData = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
        );
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fulfill(
              requestId,
              airnodeAddress,
              fulfillData,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Invalid request fulfillment');
      });
    });
  });
  context('Full request made', function () {
    context('Caller is sponsor wallet', function () {
      context('Fulfillment parameters are correct', function () {
        context('Fulfill function does not revert', function () {
          it('returns `true` and fulfills', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
            // Make the request
            const endpointId = utils.generateRandomBytes32();
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  rrpRequester.address,
                  endpointId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
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
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
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
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
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
            const endpointId = utils.generateRandomBytes32();
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  rrpRequester.address,
                  endpointId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            // Returns false because the target function always reverts
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                { gasLimit: 500000 }
              );
            expect(staticCallResult.callSuccess).to.equal(false);
            expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Always reverts');
            // Fulfill the request (which will emit a failed event)
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
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
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysReverts'),
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
            const endpointId = utils.generateRandomBytes32();
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(roles.randomPerson.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  roles.randomPerson.address,
                  endpointId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            // Returns false because the requester was not expecting the fulfillment
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              );
            expect(staticCallResult.callSuccess).to.equal(false);
            expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('No such request made');
            // Fulfill the request (which will emit a failed event)
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfill'),
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
            const endpointId = utils.generateRandomBytes32();
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  rrpRequester.address,
                  endpointId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            // Returns false because the target function always reverts
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
                { gasLimit: 500000 }
              );
            expect(staticCallResult.callSuccess).to.equal(false);
            expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
            // Fulfill the request (which will emit a failed event)
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
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
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRevertsWithNoString'),
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
            const endpointId = utils.generateRandomBytes32();
            const requestTimeParameters = utils.generateRandomBytes();
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
                ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  rrpRequester.address,
                  endpointId,
                  roles.sponsor.address,
                  requestTimeParameters,
                ]
              )
            );
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            // Make static call to check fulfillment result
            // Returns false because the target function always reverts
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                { gasLimit: 500000 }
              );
            expect(staticCallResult.callSuccess).to.equal(false);
            expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
            // Fulfill the request (which will emit a failed event)
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillData,
                  rrpRequester.address,
                  rrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                  { gasLimit: 500000 }
                )
            )
              .to.emit(airnodeRrp, 'FailedRequest')
              .withArgs(airnodeAddress, requestId, 'Fulfillment failed unexpectedly');
            expect(await rrpRequester.requestIdToData(requestId)).to.equal('0x');
          });
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
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
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                endpointId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                hre.ethers.constants.AddressZero,
                fulfillData,
                rrpRequester.address,
                rrpRequester.interface.getSighash('fulfill'),
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
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                endpointId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                fulfillData,
                hre.ethers.constants.AddressZero,
                rrpRequester.interface.getSighash('fulfill'),
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
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                endpointId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(requestId, airnodeAddress, fulfillData, rrpRequester.address, '0x00000000', {
                gasLimit: 500000,
              })
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Caller not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Make the request
        const endpointId = utils.generateRandomBytes32();
        const requestTimeParameters = utils.generateRandomBytes();
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
            ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
            [
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              (await hre.ethers.provider.getNetwork()).chainId,
              rrpRequester.address,
              endpointId,
              roles.sponsor.address,
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fulfill the request
        const fulfillData = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
        );
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fulfill(
              requestId,
              airnodeAddress,
              fulfillData,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Invalid request fulfillment');
      });
    });
  });
});

describe('fail', function () {
  context('Template request made', function () {
    context('Caller is sponsor wallet', function () {
      context('Fulfillment parameters are correct', function () {
        it('fails successfully', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                templateId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Fail the request
          const sponsorWallet = utils
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
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
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
          const sponsorWallet = utils
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
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                templateId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
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
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                templateId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
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
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                templateId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
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
    context('Caller not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Create the template
        const endpointId = utils.generateRandomBytes32();
        const parameters = utils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Make the request
        const requestTimeParameters = utils.generateRandomBytes();
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
            ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
            [
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              (await hre.ethers.provider.getNetwork()).chainId,
              rrpRequester.address,
              templateId,
              roles.sponsor.address,
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
    context('Caller is sponsor wallet', function () {
      context('Fulfillment parameters are correct', function () {
        it('fails successfully', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                endpointId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Fail the request
          const sponsorWallet = utils
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
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
          const sponsorWallet = utils
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
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                endpointId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
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
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                endpointId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
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
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
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
              ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpRequester.address,
                endpointId,
                roles.sponsor.address,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
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
    context('Caller not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);
        // Make the request
        const endpointId = utils.generateRandomBytes32();
        const requestTimeParameters = utils.generateRandomBytes();
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
            ['uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes'],
            [
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              (await hre.ethers.provider.getNetwork()).chainId,
              rrpRequester.address,
              endpointId,
              roles.sponsor.address,
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
