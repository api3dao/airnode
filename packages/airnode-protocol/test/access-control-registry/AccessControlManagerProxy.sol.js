/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

describe('AccessControlManagerProxy', () => {
  let roles;
  let accessControlRegistry, accessControlManagerProxy;
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
    const accessControlManagerProxyFactory = await hre.ethers.getContractFactory(
      'AccessControlManagerProxy',
      roles.deployer
    );
    accessControlManagerProxy = await accessControlManagerProxyFactory.deploy(accessControlRegistry.address);
    await accessControlManagerProxy.transferOwnership(roles.agentOwner.address);
    managerRootRole = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['address'], [accessControlManagerProxy.address])
    );
    roleDescription = 'Role description unique to adminRole';
  });

  describe('constructor', () => {
    context('_accessControlRegistry is not zero address', () => {
      it('constructs', async () => {
        const accessControlManagerProxyFactory = await hre.ethers.getContractFactory(
          'AccessControlManagerProxy',
          roles.deployer
        );
        accessControlManagerProxy = await accessControlManagerProxyFactory.deploy(accessControlRegistry.address);
        expect(await accessControlManagerProxy.accessControlRegistry()).to.equal(accessControlRegistry.address);
      });
    });
    context('_accessControlRegistry is zero address', () => {
      it('reverts', async () => {
        const accessControlManagerProxyFactory = await hre.ethers.getContractFactory(
          'AccessControlManagerProxy',
          roles.deployer
        );
        await expect(accessControlManagerProxyFactory.deploy(hre.ethers.constants.AddressZero)).to.be.revertedWith(
          'ACR address zero'
        );
      });
    });
  });

  describe('initializeRole', () => {
    describe('Sender is agent owner', () => {
      it('initializesRole', async () => {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManagerProxy.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await expect(
          accessControlManagerProxy.connect(roles.agentOwner).initializeRole(managerRootRole, roleDescription)
        )
          .to.emit(accessControlRegistry, 'InitializedRole')
          .withArgs(role, managerRootRole, roleDescription, accessControlManagerProxy.address);
      });
    });
    describe('Sender is not agent owner', () => {
      it('reverts', async () => {
        await expect(
          accessControlManagerProxy.connect(roles.randomPerson).initializeRole(managerRootRole, roleDescription)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });

  describe('initializeAndGrantRoles', () => {
    describe('Sender is agent owner', () => {
      it('initializes role', async () => {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManagerProxy.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await expect(
          accessControlManagerProxy
            .connect(roles.agentOwner)
            .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address])
        )
          .to.emit(accessControlRegistry, 'InitializedRole')
          .withArgs(role, managerRootRole, roleDescription, accessControlManagerProxy.address);
        expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(true);
      });
    });
    describe('Sender is not agent owner', () => {
      it('reverts', async () => {
        await expect(
          accessControlManagerProxy
            .connect(roles.randomPerson)
            .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address])
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });

  describe('grantRole', () => {
    describe('Sender is agent owner', () => {
      it('grants role', async () => {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManagerProxy.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await accessControlManagerProxy.connect(roles.agentOwner).initializeRole(managerRootRole, roleDescription);
        await expect(accessControlManagerProxy.connect(roles.agentOwner).grantRole(role, roles.account.address))
          .to.emit(accessControlRegistry, 'RoleGranted')
          .withArgs(role, roles.account.address, accessControlManagerProxy.address);
      });
    });
    describe('Sender is not agent owner', () => {
      it('reverts', async () => {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManagerProxy.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await accessControlManagerProxy.connect(roles.agentOwner).initializeRole(managerRootRole, roleDescription);
        await expect(
          accessControlManagerProxy.connect(roles.randomPerson).grantRole(role, roles.account.address)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });

  describe('revokeRole', () => {
    describe('Sender is agent owner', () => {
      it('revokes role', async () => {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManagerProxy.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await accessControlManagerProxy
          .connect(roles.agentOwner)
          .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address]);
        await expect(accessControlManagerProxy.connect(roles.agentOwner).revokeRole(role, roles.account.address))
          .to.emit(accessControlRegistry, 'RoleRevoked')
          .withArgs(role, roles.account.address, accessControlManagerProxy.address);
      });
    });
    describe('Sender is not agent owner', () => {
      it('reverts', async () => {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManagerProxy.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await accessControlManagerProxy
          .connect(roles.agentOwner)
          .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address]);
        await expect(
          accessControlManagerProxy.connect(roles.randomPerson).revokeRole(role, roles.account.address)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });

  describe('renounceRole', () => {
    describe('Sender is agent owner', () => {
      it('renounces role', async () => {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManagerProxy.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await accessControlManagerProxy
          .connect(roles.agentOwner)
          .initializeAndGrantRoles([managerRootRole], [roleDescription], [accessControlManagerProxy.address]);
        await expect(
          accessControlManagerProxy.connect(roles.agentOwner).renounceRole(role, accessControlManagerProxy.address)
        )
          .to.emit(accessControlRegistry, 'RoleRevoked')
          .withArgs(role, accessControlManagerProxy.address, accessControlManagerProxy.address);
      });
    });
    describe('Sender is not agent owner', () => {
      it('reverts', async () => {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(accessControlManagerProxy.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await accessControlManagerProxy
          .connect(roles.agentOwner)
          .initializeAndGrantRoles([managerRootRole], [roleDescription], [accessControlManagerProxy.address]);
        await expect(
          accessControlManagerProxy.connect(roles.randomPerson).renounceRole(role, accessControlManagerProxy.address)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });
});
