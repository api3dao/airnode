/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let roles;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    accessControlRegistry: accounts[1],
    manager: accounts[2],
  };
});

describe('constructor', function () {
  context('Admin role description is not empty', function () {
    it('constructs', async function () {
      const adminRoleDescription = 'Admin role description';
      const accessControlRegistryAdminnedWithManagerFactory = await hre.ethers.getContractFactory(
        'AccessControlRegistryAdminnedWithManager',
        roles.deployer
      );
      const accessControlRegistryAdminnedWithManager = await accessControlRegistryAdminnedWithManagerFactory.deploy(
        roles.accessControlRegistry.address,
        adminRoleDescription,
        roles.manager.address
      );
      expect(await accessControlRegistryAdminnedWithManager.manager()).to.be.equal(roles.manager.address);
      const managerRootRole = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['address'], [roles.manager.address])
      );
      const adminRoleDescriptionHash = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['string'], [adminRoleDescription])
      );
      const adminRole = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['bytes32', 'bytes32'], [managerRootRole, adminRoleDescriptionHash])
      );
      expect(await accessControlRegistryAdminnedWithManager.adminRole()).to.equal(adminRole);
    });
  });
  context('Admin role description is not empty', function () {
    it('reverts', async function () {
      const adminRoleDescription = 'Admin role description';
      const accessControlRegistryAdminnedWithManagerFactory = await hre.ethers.getContractFactory(
        'AccessControlRegistryAdminnedWithManager',
        roles.deployer
      );
      await expect(
        accessControlRegistryAdminnedWithManagerFactory.deploy(
          roles.accessControlRegistry.address,
          adminRoleDescription,
          hre.ethers.constants.AddressZero
        )
      ).to.be.revertedWith('Manager address zero');
    });
  });
});
