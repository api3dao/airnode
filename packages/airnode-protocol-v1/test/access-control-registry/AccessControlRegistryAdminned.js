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
  context('Admin role description is not empty', function () {
    it('constructs', async function () {
      const adminRoleDescription = 'Admin role description';
      const accessControlRegistryAdminnedFactory = await hre.ethers.getContractFactory(
        'AccessControlRegistryAdminned',
        roles.deployer
      );
      const accessControlRegistryAdminned = await accessControlRegistryAdminnedFactory.deploy(
        roles.accessControlRegistry.address,
        adminRoleDescription
      );
      expect(await accessControlRegistryAdminned.adminRoleDescription()).to.be.equal(adminRoleDescription);
    });
  });
  context('Admin role description is not empty', function () {
    it('reverts', async function () {
      const accessControlRegistryAdminnedFactory = await hre.ethers.getContractFactory(
        'AccessControlRegistryAdminned',
        roles.deployer
      );
      await expect(
        accessControlRegistryAdminnedFactory.deploy(roles.accessControlRegistry.address, '')
      ).to.be.revertedWith('Admin role description empty');
    });
  });
});
