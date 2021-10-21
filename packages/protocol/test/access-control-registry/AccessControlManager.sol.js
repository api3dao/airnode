/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let roles;
let accessControlRegistry, accessControlManager;
let managerRootRole, roleDescription;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    managerOwner: accounts[1],
    account: accounts[2],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const accessControlManagerFactory = await hre.ethers.getContractFactory('AccessControlManager', roles.deployer);
  accessControlManager = await accessControlManagerFactory.deploy(accessControlRegistry.address);
  await accessControlManager.transferOwnership(roles.managerOwner.address);
  managerRootRole = hre.ethers.utils.defaultAbiCoder.encode(['address'], [accessControlManager.address]);
  roleDescription = 'Role description unique to adminRole';
});

describe('constructor', function () {
  context('accessControlRegistry_ is not zero address', function () {
    it('constructs', async function () {
      const accessControlManagerFactory = await hre.ethers.getContractFactory('AccessControlManager', roles.deployer);
      accessControlManager = await accessControlManagerFactory.deploy(accessControlRegistry.address);
      expect(await accessControlManager.accessControlRegistry()).to.equal(accessControlRegistry.address);
    });
  });
  context('accessControlRegistry_ is zero address', function () {
    it('reverts', async function () {
      const accessControlManagerFactory = await hre.ethers.getContractFactory('AccessControlManager', roles.deployer);
      await expect(accessControlManagerFactory.deploy(hre.ethers.constants.AddressZero)).to.be.revertedWith(
        'Zero address'
      );
    });
  });
});

describe('initializeRole', function () {
  describe('Caller is manager owner', function () {
    it('initializesRole', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManager.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await expect(accessControlManager.connect(roles.managerOwner).initializeRole(managerRootRole, roleDescription))
        .to.emit(accessControlRegistry, 'InitializedRole')
        .withArgs(role, managerRootRole, roleDescription, accessControlManager.address);
    });
  });
  describe('Caller is not manager owner', function () {
    it('reverts', async function () {
      await expect(
        accessControlManager.connect(roles.randomPerson).initializeRole(managerRootRole, roleDescription)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('initializeAndGrantRole', function () {
  describe('Caller is manager owner', function () {
    it('initializes role', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManager.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await expect(
        accessControlManager
          .connect(roles.managerOwner)
          .initializeAndGrantRole(managerRootRole, roleDescription, roles.account.address)
      )
        .to.emit(accessControlRegistry, 'InitializedRole')
        .withArgs(role, managerRootRole, roleDescription, accessControlManager.address);
      expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(true);
    });
  });
  describe('Caller is not manager owner', function () {
    it('reverts', async function () {
      await expect(
        accessControlManager
          .connect(roles.randomPerson)
          .initializeAndGrantRole(managerRootRole, roleDescription, roles.account.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('grantRole', function () {
  describe('Caller is manager owner', function () {
    it('grants role', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManager.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlManager.connect(roles.managerOwner).initializeRole(managerRootRole, roleDescription);
      await expect(accessControlManager.connect(roles.managerOwner).grantRole(role, roles.account.address))
        .to.emit(accessControlRegistry, 'RoleGranted')
        .withArgs(role, roles.account.address, accessControlManager.address);
    });
  });
  describe('Caller is not manager owner', function () {
    it('reverts', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManager.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlManager.connect(roles.managerOwner).initializeRole(managerRootRole, roleDescription);
      await expect(
        accessControlManager.connect(roles.randomPerson).grantRole(role, roles.account.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('revokeRole', function () {
  describe('Caller is manager owner', function () {
    it('revokes role', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManager.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlManager
        .connect(roles.managerOwner)
        .initializeAndGrantRole(managerRootRole, roleDescription, roles.account.address);
      await expect(accessControlManager.connect(roles.managerOwner).revokeRole(role, roles.account.address))
        .to.emit(accessControlRegistry, 'RoleRevoked')
        .withArgs(role, roles.account.address, accessControlManager.address);
    });
  });
  describe('Caller is not manager owner', function () {
    it('reverts', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManager.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlManager
        .connect(roles.managerOwner)
        .initializeAndGrantRole(managerRootRole, roleDescription, roles.account.address);
      await expect(
        accessControlManager.connect(roles.randomPerson).revokeRole(role, roles.account.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('renounceRole', function () {
  describe('Caller is manager owner', function () {
    it('renounces role', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManager.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlManager
        .connect(roles.managerOwner)
        .initializeAndGrantRole(managerRootRole, roleDescription, accessControlManager.address);
      await expect(accessControlManager.connect(roles.managerOwner).renounceRole(role, accessControlManager.address))
        .to.emit(accessControlRegistry, 'RoleRevoked')
        .withArgs(role, accessControlManager.address, accessControlManager.address);
    });
  });
  describe('Caller is not manager owner', function () {
    it('reverts', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManager.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlManager
        .connect(roles.managerOwner)
        .initializeAndGrantRole(managerRootRole, roleDescription, accessControlManager.address);
      await expect(
        accessControlManager.connect(roles.randomPerson).renounceRole(role, accessControlManager.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
