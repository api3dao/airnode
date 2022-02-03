/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let roles;
let accessControlRegistry, airnodeEndpointPriceRegistry;
let airnodeEndpointPriceRegistryAdminRoleDescription = 'AirnodeEndpointPriceRegistry admin';

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const airnodeEndpointPriceRegistryFactory = await hre.ethers.getContractFactory(
    'AirnodeEndpointPriceRegistry',
    roles.deployer
  );
  airnodeEndpointPriceRegistry = await airnodeEndpointPriceRegistryFactory.deploy(
    accessControlRegistry.address,
    airnodeEndpointPriceRegistryAdminRoleDescription,
    roles.manager.address
  );
});

describe('constructor', function () {
  context('AirnodeEndpointPriceRegistry address is not zero', function () {
    it('constructs', async function () {
      const airnodeEndpointPriceRegistryUserFactory = await hre.ethers.getContractFactory(
        'AirnodeEndpointPriceRegistryUser',
        roles.deployer
      );
      const airnodeEndpointPriceRegistryUser = await airnodeEndpointPriceRegistryUserFactory.deploy(
        airnodeEndpointPriceRegistry.address
      );
      expect(await airnodeEndpointPriceRegistryUser.airnodeEndpointPriceRegistry()).to.equal(
        airnodeEndpointPriceRegistry.address
      );
    });
  });
  context('AirnodeEndpointPriceRegistry address is zero', function () {
    it('reverts', async function () {
      const airnodeEndpointPriceRegistryUserFactory = await hre.ethers.getContractFactory(
        'AirnodeEndpointPriceRegistryUser',
        roles.deployer
      );
      await expect(airnodeEndpointPriceRegistryUserFactory.deploy(hre.ethers.constants.AddressZero)).to.be.revertedWith(
        'Price registry address zero'
      );
    });
  });
});
