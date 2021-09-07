/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

let roles;
let rrpRequester, airnodeRrp;
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

describe('onlyAirnodeRrp', function () {
  context('Caller AirnodeRrp', function () {
    it('does not revert', async function () {
      await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpRequester.address, true);

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
          ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
          [
            (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
            (await hre.ethers.provider.getNetwork()).chainId,
            rrpRequester.address,
            templateId,
            requestTimeParameters,
          ]
        )
      );
      // Fulfill the request by making sure the caller is the airnodeRrp
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
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            { gasLimit: 500000 }
          )
      ).to.not.be.revertedWith('Fulfillment failed');
    });
  });
  context('Caller not AirnodeRrp', function () {
    it('reverts', async function () {
      await expect(
        rrpRequester.connect(roles.randomPerson).fulfill(hre.ethers.constants.HashZero, 0, '0x')
      ).to.be.revertedWith('Caller not Airnode RRP');
    });
  });
});
