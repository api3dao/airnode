/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let roles;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    accessControlRegistry: accounts[1],
  };
});

describe('constructor', function () {
  context('AccessControlRegistry address is not zero', function () {
    it('constructs', async function () {
      const accessControlRegistryUserFactory = await hre.ethers.getContractFactory(
        'AccessControlRegistryUser',
        roles.deployer
      );
      const accessControlRegistryUser = await accessControlRegistryUserFactory.deploy(
        roles.accessControlRegistry.address
      );
      expect(await accessControlRegistryUser.accessControlRegistry()).to.be.equal(roles.accessControlRegistry.address);
    });
  });
  context('AccessControlRegistry address is zero', function () {
    it('reverts', async function () {
      const accessControlRegistryUserFactory = await hre.ethers.getContractFactory(
        'AccessControlRegistryUser',
        roles.deployer
      );
      await expect(accessControlRegistryUserFactory.deploy(hre.ethers.constants.AddressZero)).to.be.revertedWith(
        'ACR address zero'
      );
    });
  });
});
