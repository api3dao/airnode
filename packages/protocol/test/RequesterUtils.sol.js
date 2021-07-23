/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('./utils');

let roles;
let airnodeRrp, airnodeRrpRequester;
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
  const airnodeRrpRequesterFactory = await hre.ethers.getContractFactory('MockAirnodeRrpRequester', roles.deployer);
  airnodeRrpRequester = await airnodeRrpRequesterFactory.deploy(airnodeRrp.address);
  ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = utils.generateRandomAirnodeWallet());
  sponsorWalletAddress = utils.deriveSponsorWalletAddress(airnodeXpub, roles.sponsor.address);
  await roles.deployer.sendTransaction({
    to: sponsorWalletAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
});

describe('setSponsorshipStatus', function () {
  it('sets sponsorship status', async function () {
    expect(
      await airnodeRrp.sponsorToRequesterToSponsorshipStatus(roles.sponsor.address, airnodeRrpRequester.address)
    ).to.equal(false);
    expect(await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).to.equal(0);
    // Set sponsorship status as true
    await expect(airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true))
      .to.emit(airnodeRrp, 'SetSponsorshipStatus')
      .withArgs(roles.sponsor.address, airnodeRrpRequester.address, true);
    expect(
      await airnodeRrp.sponsorToRequesterToSponsorshipStatus(roles.sponsor.address, airnodeRrpRequester.address)
    ).to.equal(true);
    expect(await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).to.equal(1);
    // Reset sponsorship status back as false
    await expect(airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, false))
      .to.emit(airnodeRrp, 'SetSponsorshipStatus')
      .withArgs(roles.sponsor.address, airnodeRrpRequester.address, false);
    expect(
      await airnodeRrp.sponsorToRequesterToSponsorshipStatus(roles.sponsor.address, airnodeRrpRequester.address)
    ).to.equal(false);
    expect(await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).to.equal(1);
  });
});

describe('createTemplate', function () {
  it('creates template', async function () {
    const endpointId = utils.generateRandomBytes32();
    const parameters = utils.generateRandomBytes();
    const templateId = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
    );
    const templateBeforeCreation = await airnodeRrp.templates(templateId);
    expect(templateBeforeCreation.airnode).to.equal(hre.ethers.constants.AddressZero);
    expect(templateBeforeCreation.endpointId).to.equal(hre.ethers.constants.HashZero);
    expect(templateBeforeCreation.parameters).to.equal('0x');
    await expect(airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters))
      .to.emit(airnodeRrp, 'CreatedTemplate')
      .withArgs(templateId, airnodeAddress, endpointId, parameters);
    const templateAfterCreation = await airnodeRrp.templates(templateId);
    expect(templateAfterCreation.airnode).to.equal(airnodeAddress);
    expect(templateAfterCreation.endpointId).to.equal(endpointId);
    expect(templateAfterCreation.parameters).to.equal(parameters);
  });
});

describe('makeTemplateRequest', function () {
  context('Requester is sponsored', function () {
    it('makes template request', async function () {
      // Endorse the requester
      await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
      // Create the template
      const endpointId = utils.generateRandomBytes32();
      const parameters = utils.generateRandomBytes();
      await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
      const templateId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
      );
      // Compute the expected request ID
      const requesterRequestCount = await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address);
      const chainId = (await hre.ethers.provider.getNetwork()).chainId;
      const requestTimeParameters = utils.generateRandomBytes();
      const expectedRequestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
          [requesterRequestCount, chainId, airnodeRrpRequester.address, templateId, requestTimeParameters]
        )
      );
      // Make the request
      await expect(
        airnodeRrpRequester
          .connect(roles.randomPerson)
          .makeTemplateRequest(
            templateId,
            roles.sponsor.address,
            sponsorWalletAddress,
            airnodeRrpRequester.address,
            airnodeRrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          )
      )
        .to.emit(airnodeRrp, 'MadeTemplateRequest')
        .withArgs(
          airnodeAddress,
          expectedRequestId,
          requesterRequestCount,
          chainId,
          airnodeRrpRequester.address,
          templateId,
          roles.sponsor.address,
          sponsorWalletAddress,
          airnodeRrpRequester.address,
          airnodeRrpRequester.interface.getSighash('fulfill'),
          requestTimeParameters
        );
      expect(await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).to.equal(
        requesterRequestCount.add(1)
      );
    });
  });
  context('Requester not sponsored', function () {
    it('reverts', async function () {
      const templateId = utils.generateRandomBytes32();
      const requestTimeParameters = utils.generateRandomBytes();
      await expect(
        airnodeRrpRequester
          .connect(roles.randomPerson)
          .makeTemplateRequest(
            templateId,
            roles.sponsor.address,
            sponsorWalletAddress,
            airnodeRrpRequester.address,
            airnodeRrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          )
      ).to.be.revertedWith('Requester not sponsored');
    });
  });
});

describe('makeFullRequest', function () {
  context('Requester is sponsored', function () {
    it('makes template request', async function () {
      // Endorse the requester
      await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
      // Compute the expected request ID
      const requesterRequestCount = await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address);
      const chainId = (await hre.ethers.provider.getNetwork()).chainId;
      const endpointId = utils.generateRandomBytes32();
      const requestTimeParameters = utils.generateRandomBytes();
      const expectedRequestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
          [requesterRequestCount, chainId, airnodeRrpRequester.address, endpointId, requestTimeParameters]
        )
      );
      // Make the request
      await expect(
        airnodeRrpRequester
          .connect(roles.randomPerson)
          .makeFullRequest(
            airnodeAddress,
            endpointId,
            roles.sponsor.address,
            sponsorWalletAddress,
            airnodeRrpRequester.address,
            airnodeRrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          )
      )
        .to.emit(airnodeRrp, 'MadeFullRequest')
        .withArgs(
          airnodeAddress,
          expectedRequestId,
          requesterRequestCount,
          chainId,
          airnodeRrpRequester.address,
          endpointId,
          roles.sponsor.address,
          sponsorWalletAddress,
          airnodeRrpRequester.address,
          airnodeRrpRequester.interface.getSighash('fulfill'),
          requestTimeParameters
        );
      expect(await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).to.equal(
        requesterRequestCount.add(1)
      );
    });
  });
  context('Requester not sponsored', function () {
    it('reverts', async function () {
      const endpointId = utils.generateRandomBytes32();
      const requestTimeParameters = utils.generateRandomBytes();
      await expect(
        airnodeRrpRequester
          .connect(roles.randomPerson)
          .makeFullRequest(
            airnodeAddress,
            endpointId,
            roles.sponsor.address,
            sponsorWalletAddress,
            airnodeRrpRequester.address,
            airnodeRrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          )
      ).to.be.revertedWith('Requester not sponsored');
    });
  });
});

describe('fulfill', function () {
  context('Template request made', function () {
    context('Caller is sponsor wallet', function () {
      context('Fulfillment parameters are correct', function () {
        context('Fulfill function does not revert', function () {
          it('fulfills', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
            // Create the template
            const endpointId = utils.generateRandomBytes32();
            const parameters = utils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            // Make the request
            const requestTimeParameters = utils.generateRandomBytes();
            await airnodeRrpRequester
              .connect(roles.randomPerson)
              .makeTemplateRequest(
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters,
                { gasLimit: 500000 }
              );
            const requestId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  airnodeRrpRequester.address,
                  templateId,
                  requestTimeParameters,
                ]
              )
            );
            // Fulfill the request
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillStatusCode = 0;
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillStatusCode,
                  fulfillData,
                  airnodeRrpRequester.address,
                  airnodeRrpRequester.interface.getSighash('fulfill'),
                  { gasLimit: 500000 }
                )
            )
              .to.emit(airnodeRrp, 'FulfilledRequest')
              .withArgs(airnodeAddress, requestId, fulfillStatusCode, fulfillData);
            expect(await airnodeRrpRequester.requestIdToStatusCode(requestId)).to.equal(fulfillStatusCode);
            expect(await airnodeRrpRequester.requestIdToData(requestId)).to.equal(fulfillData);
            // Attempt to fulfill the request a second time
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillStatusCode,
                  fulfillData,
                  airnodeRrpRequester.address,
                  airnodeRrpRequester.interface.getSighash('fulfill'),
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Invalid request fulfillment');
          });
        });
        context('Fulfill function reverts', function () {
          it('reverts', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
            // Create the template
            const endpointId = utils.generateRandomBytes32();
            const parameters = utils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            // Make the request
            const requestTimeParameters = utils.generateRandomBytes();
            await airnodeRrpRequester
              .connect(roles.randomPerson)
              .makeTemplateRequest(
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                requestTimeParameters
              );
            const requestId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  airnodeRrpRequester.address,
                  templateId,
                  requestTimeParameters,
                ]
              )
            );
            // Attempt to fulfill the request
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillStatusCode = 0;
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillStatusCode,
                  fulfillData,
                  airnodeRrpRequester.address,
                  airnodeRrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Fulfillment failed');
          });
        });
        context('Fulfill function does not return', function () {
          it('reverts', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
            // Create the template
            const endpointId = utils.generateRandomBytes32();
            const parameters = utils.generateRandomBytes();
            await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
            const templateId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
            );
            // Make the request
            const requestTimeParameters = utils.generateRandomBytes();
            await airnodeRrpRequester
              .connect(roles.randomPerson)
              .makeTemplateRequest(
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                requestTimeParameters
              );
            const requestId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  airnodeRrpRequester.address,
                  templateId,
                  requestTimeParameters,
                ]
              )
            );
            // Attempt to fulfill the request
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillStatusCode = 0;
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillStatusCode,
                  fulfillData,
                  airnodeRrpRequester.address,
                  airnodeRrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Fulfillment failed');
          });
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillStatusCode = 0;
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                fulfillStatusCode,
                fulfillData,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Airnode address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                templateId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillStatusCode = 0;
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                hre.ethers.constants.AddressZero,
                fulfillStatusCode,
                fulfillData,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                templateId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillStatusCode = 0;
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                fulfillStatusCode,
                fulfillData,
                hre.ethers.constants.AddressZero,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                templateId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillStatusCode = 0;
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                fulfillStatusCode,
                fulfillData,
                airnodeRrpRequester.address,
                '0x00000000',
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Caller not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
        // Create the template
        const endpointId = utils.generateRandomBytes32();
        const parameters = utils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Make the request
        const requestTimeParameters = utils.generateRandomBytes();
        await airnodeRrpRequester
          .connect(roles.randomPerson)
          .makeTemplateRequest(
            templateId,
            roles.sponsor.address,
            sponsorWalletAddress,
            airnodeRrpRequester.address,
            airnodeRrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [
              (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrpRequester.address,
              templateId,
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fulfill the request
        const fulfillStatusCode = 0;
        const fulfillData = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
        );
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fulfill(
              requestId,
              airnodeAddress,
              fulfillStatusCode,
              fulfillData,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
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
          it('fulfills', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
            // Make the request
            const endpointId = utils.generateRandomBytes32();
            const requestTimeParameters = utils.generateRandomBytes();
            await airnodeRrpRequester
              .connect(roles.randomPerson)
              .makeFullRequest(
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                requestTimeParameters
              );
            const requestId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  airnodeRrpRequester.address,
                  endpointId,
                  requestTimeParameters,
                ]
              )
            );
            // Fulfill the request
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillStatusCode = 0;
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillStatusCode,
                  fulfillData,
                  airnodeRrpRequester.address,
                  airnodeRrpRequester.interface.getSighash('fulfill'),
                  { gasLimit: 500000 }
                )
            )
              .to.emit(airnodeRrp, 'FulfilledRequest')
              .withArgs(airnodeAddress, requestId, fulfillStatusCode, fulfillData);
            expect(await airnodeRrpRequester.requestIdToStatusCode(requestId)).to.equal(fulfillStatusCode);
            expect(await airnodeRrpRequester.requestIdToData(requestId)).to.equal(fulfillData);
            // Attempt to fulfill the request a second time
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillStatusCode,
                  fulfillData,
                  airnodeRrpRequester.address,
                  airnodeRrpRequester.interface.getSighash('fulfill'),
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Invalid request fulfillment');
          });
        });
        context('Fulfill function reverts', function () {
          it('reverts', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
            // Make the request
            const endpointId = utils.generateRandomBytes32();
            const requestTimeParameters = utils.generateRandomBytes();
            await airnodeRrpRequester
              .connect(roles.randomPerson)
              .makeFullRequest(
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                requestTimeParameters
              );
            const requestId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  airnodeRrpRequester.address,
                  endpointId,
                  requestTimeParameters,
                ]
              )
            );
            // Attempt to fulfill the request
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillStatusCode = 0;
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillStatusCode,
                  fulfillData,
                  airnodeRrpRequester.address,
                  airnodeRrpRequester.interface.getSighash('fulfillAlwaysReverts'),
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Fulfillment failed');
          });
        });
        context('Fulfill function does not return', function () {
          it('reverts', async function () {
            // Endorse the requester
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
            // Make the request
            const endpointId = utils.generateRandomBytes32();
            const requestTimeParameters = utils.generateRandomBytes();
            await airnodeRrpRequester
              .connect(roles.randomPerson)
              .makeFullRequest(
                airnodeAddress,
                endpointId,
                roles.sponsor.address,
                sponsorWalletAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                requestTimeParameters
              );
            const requestId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
                [
                  (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                  (await hre.ethers.provider.getNetwork()).chainId,
                  airnodeRrpRequester.address,
                  endpointId,
                  requestTimeParameters,
                ]
              )
            );
            // Attempt to fulfill the request
            const sponsorWallet = utils
              .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
              .connect(hre.ethers.provider);
            const fulfillStatusCode = 0;
            const fulfillData = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
            );
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  fulfillStatusCode,
                  fulfillData,
                  airnodeRrpRequester.address,
                  airnodeRrpRequester.interface.getSighash('fulfillAlwaysRunsOutOfGas'),
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Fulfillment failed');
          });
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillStatusCode = 0;
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                fulfillStatusCode,
                fulfillData,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Airnode address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                endpointId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillStatusCode = 0;
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                hre.ethers.constants.AddressZero,
                fulfillStatusCode,
                fulfillData,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                endpointId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillStatusCode = 0;
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                fulfillStatusCode,
                fulfillData,
                hre.ethers.constants.AddressZero,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                endpointId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fulfill the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const fulfillStatusCode = 0;
          const fulfillData = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                fulfillStatusCode,
                fulfillData,
                airnodeRrpRequester.address,
                '0x00000000',
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Caller not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
        // Make the request
        const endpointId = utils.generateRandomBytes32();
        const requestTimeParameters = utils.generateRandomBytes();
        await airnodeRrpRequester
          .connect(roles.randomPerson)
          .makeFullRequest(
            airnodeAddress,
            endpointId,
            roles.sponsor.address,
            sponsorWalletAddress,
            airnodeRrpRequester.address,
            airnodeRrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [
              (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrpRequester.address,
              endpointId,
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fulfill the request
        const fulfillStatusCode = 0;
        const fulfillData = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
        );
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fulfill(
              requestId,
              airnodeAddress,
              fulfillStatusCode,
              fulfillData,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
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
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                templateId,
                requestTimeParameters,
              ]
            )
          );
          // Fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeRrp, 'FailedRequest')
            .withArgs(airnodeAddress, requestId);
          expect(await airnodeRrp.requestWithIdHasFailed(requestId)).to.equal(true);
          expect(await airnodeRrpRequester.requestIdToStatusCode(requestId)).to.equal(0);
          expect(await airnodeRrpRequester.requestIdToData(requestId)).to.equal('0x');
          // Attempt to fail the request a second time
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          // Attempt to fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Airnode address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                templateId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                hre.ethers.constants.AddressZero,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                templateId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                hre.ethers.constants.AddressZero,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                templateId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(requestId, airnodeAddress, airnodeRrpRequester.address, '0x00000000', { gasLimit: 500000 })
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Caller not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
        // Create the template
        const endpointId = utils.generateRandomBytes32();
        const parameters = utils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Make the request
        const requestTimeParameters = utils.generateRandomBytes();
        await airnodeRrpRequester
          .connect(roles.randomPerson)
          .makeTemplateRequest(
            templateId,
            roles.sponsor.address,
            sponsorWalletAddress,
            airnodeRrpRequester.address,
            airnodeRrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [
              (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrpRequester.address,
              templateId,
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fail the request
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fail(
              requestId,
              airnodeAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              { gasLimit: 500000 }
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
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                endpointId,
                requestTimeParameters,
              ]
            )
          );
          // Fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeRrp, 'FailedRequest')
            .withArgs(airnodeAddress, requestId);
          expect(await airnodeRrp.requestWithIdHasFailed(requestId)).to.equal(true);
          expect(await airnodeRrpRequester.requestIdToStatusCode(requestId)).to.equal(0);
          expect(await airnodeRrpRequester.requestIdToData(requestId)).to.equal('0x');
          // Attempt to fulfill the request a second time
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Request ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          // Attempt to fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                hre.ethers.constants.HashZero,
                airnodeAddress,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Airnode address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                endpointId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                hre.ethers.constants.AddressZero,
                airnodeRrpRequester.address,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill address is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                endpointId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(
                requestId,
                airnodeAddress,
                hre.ethers.constants.AddressZero,
                airnodeRrpRequester.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function ID is incorrect', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
          // Make the request
          const endpointId = utils.generateRandomBytes32();
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrpRequester
            .connect(roles.randomPerson)
            .makeFullRequest(
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrpRequester.address,
                endpointId,
                requestTimeParameters,
              ]
            )
          );
          // Attempt to fail the request
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fail(requestId, airnodeAddress, airnodeRrpRequester.address, '0x00000000', { gasLimit: 500000 })
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Caller not sponsor wallet', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(airnodeRrpRequester.address, true);
        // Make the request
        const endpointId = utils.generateRandomBytes32();
        const requestTimeParameters = utils.generateRandomBytes();
        await airnodeRrpRequester
          .connect(roles.randomPerson)
          .makeFullRequest(
            airnodeAddress,
            endpointId,
            roles.sponsor.address,
            sponsorWalletAddress,
            airnodeRrpRequester.address,
            airnodeRrpRequester.interface.getSighash('fulfill'),
            requestTimeParameters
          );
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [
              (await airnodeRrp.requesterToRequestCountPlusOne(airnodeRrpRequester.address)).sub(1),
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrpRequester.address,
              endpointId,
              requestTimeParameters,
            ]
          )
        );
        // Attempt to fail the request
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fail(
              requestId,
              airnodeAddress,
              airnodeRrpRequester.address,
              airnodeRrpRequester.interface.getSighash('fulfill'),
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Invalid request fulfillment');
      });
    });
  });
});
