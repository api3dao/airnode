/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let airnodeProtocol;
let airnodeAddress, endpointId, templateParameters, templateId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    randomPerson: accounts[9],
  };
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  airnodeAddress = testUtils.generateRandomAddress();
  endpointId = testUtils.generateRandomBytes32();
  templateParameters = testUtils.generateRandomBytes();
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, templateParameters])
  );
});

describe('constructor', function () {
  it('constructs', async function () {
    expect(await airnodeProtocol.MAXIMUM_PARAMETER_LENGTH()).to.equal(4096);
  });
});

describe('storeTemplate', function () {
  context('Airnode address is not zero', function () {
    context('Template parameters are not too long', function () {
      it('stores and registers template', async function () {
        await expect(
          airnodeProtocol.connect(roles.randomPerson).storeTemplate(airnodeAddress, endpointId, templateParameters)
        )
          .to.emit(airnodeProtocol, 'StoredTemplate')
          .withArgs(templateId, airnodeAddress, endpointId, templateParameters);
        const template = await airnodeProtocol.getStoredTemplate(templateId);
        expect(template.airnode).to.equal(airnodeAddress);
        expect(template.endpointId).to.equal(endpointId);
        expect(template.parameters).to.equal(templateParameters);
        expect(await airnodeProtocol.templateIdToAirnode(templateId)).to.equal(airnodeAddress);
      });
    });
    context('Template parameters are too long', function () {
      it('reverts', async function () {
        await expect(
          airnodeProtocol
            .connect(roles.randomPerson)
            .storeTemplate(airnodeAddress, endpointId, `0x${'12'.repeat(4096 + 1)}`)
        ).to.be.revertedWith('Parameters too long');
      });
    });
  });
  context('Airnode address is zero', function () {
    it('reverts', async function () {
      await expect(
        airnodeProtocol
          .connect(roles.randomPerson)
          .storeTemplate(hre.ethers.constants.AddressZero, endpointId, templateParameters)
      ).to.be.revertedWith('Airnode address zero');
    });
  });
});

describe('registerTemplate', function () {
  context('Airnode address is not zero', function () {
    it('registers template', async function () {
      await expect(
        airnodeProtocol.connect(roles.randomPerson).registerTemplate(airnodeAddress, endpointId, templateParameters)
      )
        .to.emit(airnodeProtocol, 'RegisteredTemplate')
        .withArgs(templateId, airnodeAddress, endpointId, templateParameters);
      await expect(airnodeProtocol.getStoredTemplate(templateId)).to.be.revertedWith('Template not stored');
      expect(await airnodeProtocol.templateIdToAirnode(templateId)).to.equal(airnodeAddress);
    });
  });
  context('Airnode address is zero', function () {
    it('reverts', async function () {
      await expect(
        airnodeProtocol
          .connect(roles.randomPerson)
          .registerTemplate(hre.ethers.constants.AddressZero, endpointId, templateParameters)
      ).to.be.revertedWith('Airnode address zero');
    });
  });
});
