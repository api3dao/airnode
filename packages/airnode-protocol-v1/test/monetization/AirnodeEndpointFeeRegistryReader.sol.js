/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let roles;
let accessControlRegistry, airnodeEndpointFeeRegistry;
let airnodeEndpointFeeRegistryAdminRoleDescription = 'AirnodeEndpointFeeRegistry admin';

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const airnodeEndpointFeeRegistryFactory = await hre.ethers.getContractFactory(
    'AirnodeEndpointFeeRegistry',
    roles.deployer
  );
  airnodeEndpointFeeRegistry = await airnodeEndpointFeeRegistryFactory.deploy(
    accessControlRegistry.address,
    airnodeEndpointFeeRegistryAdminRoleDescription,
    roles.manager.address
  );
});

describe('constructor', function () {
  context('AirnodeEndpointFeeRegistry address is not zero', function () {
    it('constructs', async function () {
      const airnodeEndpointFeeRegistryReaderFactory = await hre.ethers.getContractFactory(
        'AirnodeEndpointFeeRegistryReader',
        roles.deployer
      );
      const airnodeEndpointFeeRegistryReader = await airnodeEndpointFeeRegistryReaderFactory.deploy(
        airnodeEndpointFeeRegistry.address
      );
      expect(await airnodeEndpointFeeRegistryReader.airnodeEndpointFeeRegistry()).to.equal(
        airnodeEndpointFeeRegistry.address
      );
    });
  });
  context('AirnodeEndpointFeeRegistry address is zero', function () {
    it('reverts', async function () {
      const airnodeEndpointFeeRegistryReaderFactory = await hre.ethers.getContractFactory(
        'AirnodeEndpointFeeRegistryReader',
        roles.deployer
      );
      await expect(airnodeEndpointFeeRegistryReaderFactory.deploy(hre.ethers.constants.AddressZero)).to.be.revertedWith(
        'Fee registry address zero'
      );
    });
  });
});
