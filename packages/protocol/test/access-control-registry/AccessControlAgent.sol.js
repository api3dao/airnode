/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let roles;
let accessControlRegistry, accessControlAgent;
let managerRootRole, roleDescription;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    agentOwner: accounts[1],
    account: accounts[2],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const accessControlAgentFactory = await hre.ethers.getContractFactory('AccessControlAgent', roles.deployer);
  accessControlAgent = await accessControlAgentFactory.deploy(accessControlRegistry.address);
  await accessControlAgent.transferOwnership(roles.agentOwner.address);
  managerRootRole = hre.ethers.utils.defaultAbiCoder.encode(['address'], [accessControlAgent.address]);
  roleDescription = 'Role description unique to adminRole';
});

describe('constructor', function () {
  context('_accessControlRegistry is not zero address', function () {
    it('constructs', async function () {
      const accessControlAgentFactory = await hre.ethers.getContractFactory('AccessControlAgent', roles.deployer);
      accessControlAgent = await accessControlAgentFactory.deploy(accessControlRegistry.address);
      expect(await accessControlAgent.accessControlRegistry()).to.equal(accessControlRegistry.address);
    });
  });
  context('_accessControlRegistry is zero address', function () {
    it('reverts', async function () {
      const accessControlAgentFactory = await hre.ethers.getContractFactory('AccessControlAgent', roles.deployer);
      await expect(accessControlAgentFactory.deploy(hre.ethers.constants.AddressZero)).to.be.revertedWith(
        'Zero address'
      );
    });
  });
});

describe('initializeRole', function () {
  describe('Sender is agent owner', function () {
    it('initializesRole', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlAgent.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await expect(accessControlAgent.connect(roles.agentOwner).initializeRole(managerRootRole, roleDescription))
        .to.emit(accessControlRegistry, 'InitializedRole')
        .withArgs(role, managerRootRole, roleDescription, accessControlAgent.address);
    });
  });
  describe('Sender is not agent owner', function () {
    it('reverts', async function () {
      await expect(
        accessControlAgent.connect(roles.randomPerson).initializeRole(managerRootRole, roleDescription)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('initializeAndGrantRole', function () {
  describe('Sender is agent owner', function () {
    it('initializes role', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlAgent.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await expect(
        accessControlAgent
          .connect(roles.agentOwner)
          .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address])
      )
        .to.emit(accessControlRegistry, 'InitializedRole')
        .withArgs(role, managerRootRole, roleDescription, accessControlAgent.address);
      expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(true);
    });
  });
  describe('Sender is not agent owner', function () {
    it('reverts', async function () {
      await expect(
        accessControlAgent
          .connect(roles.randomPerson)
          .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address])
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('grantRole', function () {
  describe('Sender is agent owner', function () {
    it('grants role', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlAgent.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlAgent.connect(roles.agentOwner).initializeRole(managerRootRole, roleDescription);
      await expect(accessControlAgent.connect(roles.agentOwner).grantRole(role, roles.account.address))
        .to.emit(accessControlRegistry, 'RoleGranted')
        .withArgs(role, roles.account.address, accessControlAgent.address);
    });
  });
  describe('Sender is not agent owner', function () {
    it('reverts', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlAgent.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlAgent.connect(roles.agentOwner).initializeRole(managerRootRole, roleDescription);
      await expect(
        accessControlAgent.connect(roles.randomPerson).grantRole(role, roles.account.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('revokeRole', function () {
  describe('Sender is agent owner', function () {
    it('revokes role', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlAgent.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlAgent
        .connect(roles.agentOwner)
        .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address]);
      await expect(accessControlAgent.connect(roles.agentOwner).revokeRole(role, roles.account.address))
        .to.emit(accessControlRegistry, 'RoleRevoked')
        .withArgs(role, roles.account.address, accessControlAgent.address);
    });
  });
  describe('Sender is not agent owner', function () {
    it('reverts', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlAgent.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlAgent
        .connect(roles.agentOwner)
        .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address]);
      await expect(
        accessControlAgent.connect(roles.randomPerson).revokeRole(role, roles.account.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('renounceRole', function () {
  describe('Sender is agent owner', function () {
    it('renounces role', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlAgent.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlAgent
        .connect(roles.agentOwner)
        .initializeAndGrantRoles([managerRootRole], [roleDescription], [accessControlAgent.address]);
      await expect(accessControlAgent.connect(roles.agentOwner).renounceRole(role, accessControlAgent.address))
        .to.emit(accessControlRegistry, 'RoleRevoked')
        .withArgs(role, accessControlAgent.address, accessControlAgent.address);
    });
  });
  describe('Sender is not agent owner', function () {
    it('reverts', async function () {
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlAgent.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await accessControlAgent
        .connect(roles.agentOwner)
        .initializeAndGrantRoles([managerRootRole], [roleDescription], [accessControlAgent.address]);
      await expect(
        accessControlAgent.connect(roles.randomPerson).renounceRole(role, accessControlAgent.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
