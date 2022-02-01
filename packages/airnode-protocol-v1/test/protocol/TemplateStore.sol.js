/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let airnodeProtocol;
let endpointId, templateParameters, templateId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    randomPerson: accounts[9],
  };
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  endpointId = testUtils.generateRandomBytes32();
  templateParameters = testUtils.generateRandomBytes();
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [endpointId, templateParameters])
  );
});

describe('constructor', function () {
  it('constructs', async function () {
    expect(await airnodeProtocol.MAXIMUM_PARAMETER_LENGTH()).to.equal(4096);
  });
});

describe('storeTemplate', function () {
  context('Template parameters are not too long', function () {
    it('stores and registers template', async function () {
      await expect(airnodeProtocol.connect(roles.randomPerson).storeTemplate(endpointId, templateParameters))
        .to.emit(airnodeProtocol, 'StoredTemplate')
        .withArgs(templateId, endpointId, templateParameters);
      const template = await airnodeProtocol.templates(templateId);
      expect(template.endpointId).to.equal(endpointId);
      expect(template.parameters).to.equal(templateParameters);
    });
  });
  context('Template parameters are too long', function () {
    it('reverts', async function () {
      await expect(
        airnodeProtocol.connect(roles.randomPerson).storeTemplate(endpointId, `0x${'12'.repeat(4096 + 1)}`)
      ).to.be.revertedWith('Parameters too long');
    });
  });
});
