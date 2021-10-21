/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let roles;
let accessControlRegistry;
let managerRootRole, roleDescription;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    account: accounts[2],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  managerRootRole = hre.ethers.utils.defaultAbiCoder.encode(['address'], [roles.manager.address]);
  roleDescription = 'Role description unique to adminRole';
});

describe('initializeManager', function () {
  context('Manager is not initialized', function () {
    it('initializes manager', async function () {
      const manager = roles.manager.address;
      expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(false);
      expect(await accessControlRegistry.roleToManager(managerRootRole)).to.equal(hre.ethers.constants.AddressZero);
      expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(0);
      await expect(accessControlRegistry.connect(roles.randomPerson).initializeManager(manager))
        .to.emit(accessControlRegistry, 'InitializedManager')
        .withArgs(manager, managerRootRole);
      expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(true);
      expect(await accessControlRegistry.roleToManager(managerRootRole)).to.equal(manager);
      expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(1);
      expect(await accessControlRegistry.managerToRoles(manager, 0)).to.equal(managerRootRole);
    });
  });
  context('Manager initialized', function () {
    it('reverts', async function () {
      const manager = roles.manager.address;
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
      await expect(accessControlRegistry.connect(roles.randomPerson).initializeManager(manager)).to.be.revertedWith(
        'Manager already initialized'
      );
    });
  });
});

// Not testing the OpenZeppelin implementation
describe('renounceRole', function () {
  context('role is not the root role of account', function () {
    context('account has role', function () {
      context('Caller is account', function () {
        it('renounces role', async function () {
          await accessControlRegistry.connect(roles.randomPerson).initializeManager(roles.manager.address);
          const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
          expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(false);
          await accessControlRegistry
            .connect(roles.manager)
            .initializeAndGrantRole(managerRootRole, roleDescription, roles.account.address);
          expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(true);
          await accessControlRegistry.connect(roles.account).renounceRole(role, roles.account.address);
          expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(false);
        });
      });
    });
  });
  context('role is the root role of account', function () {
    it('reverts', async function () {
      await expect(
        accessControlRegistry.connect(roles.manager).renounceRole(managerRootRole, roles.manager.address)
      ).to.be.revertedWith('role is root role of account');
    });
  });
});

describe('initializeRole', function () {
  context('Caller has adminRole', function () {
    context('Role is not initialized', function () {
      it('initializes role', async function () {
        const manager = roles.manager.address;
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        expect(await accessControlRegistry.roleToDescription(role)).to.equal('');
        expect(await accessControlRegistry.roleToManager(role)).to.equal(hre.ethers.constants.AddressZero);
        expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(1);
        expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(hre.ethers.constants.HashZero);
        await expect(accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription))
          .to.emit(accessControlRegistry, 'InitializedRole')
          .withArgs(role, managerRootRole, roleDescription, manager);
        expect(await accessControlRegistry.roleToDescription(role)).to.equal(roleDescription);
        expect(await accessControlRegistry.roleToManager(role)).to.equal(manager);
        expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(2);
        expect(await accessControlRegistry.managerToRoles(manager, 1)).to.equal(role);
        expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
      });
    });
    context('Role is initialized', function () {
      it('reverts', async function () {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(roles.manager.address);
        await accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription);
        await expect(
          accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription)
        ).to.be.revertedWith('Role already initialized');
      });
    });
  });
  context('Caller does not have adminRole', function () {
    it('reverts', async function () {
      await expect(
        accessControlRegistry.connect(roles.randomPerson).initializeRole(managerRootRole, roleDescription)
      ).to.be.revertedWith(
        `AccessControl: account ${roles.randomPerson.address.toLowerCase()} is missing role ${managerRootRole.toLowerCase()}`
      );
    });
  });
});

describe('initializeAndGrantRole', function () {
  context('Caller has adminRole', function () {
    context('Role is not initialized', function () {
      it('initializes and grants role', async function () {
        const manager = roles.manager.address;
        const account = roles.account.address;
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        expect(await accessControlRegistry.roleToDescription(role)).to.equal('');
        expect(await accessControlRegistry.roleToManager(role)).to.equal(hre.ethers.constants.AddressZero);
        expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(1);
        expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(hre.ethers.constants.HashZero);
        expect(await accessControlRegistry.hasRole(role, account)).to.equal(false);
        await accessControlRegistry
          .connect(roles.manager)
          .initializeAndGrantRole(managerRootRole, roleDescription, account);
        expect(await accessControlRegistry.roleToDescription(role)).to.equal(roleDescription);
        expect(await accessControlRegistry.roleToManager(role)).to.equal(manager);
        expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(2);
        expect(await accessControlRegistry.managerToRoles(manager, 1)).to.equal(role);
        expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
        expect(await accessControlRegistry.hasRole(role, account)).to.equal(true);
      });
    });
    context('Role is initialized', function () {
      it('reverts', async function () {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(roles.manager.address);
        await accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription);
        await expect(
          accessControlRegistry
            .connect(roles.manager)
            .initializeAndGrantRole(managerRootRole, roleDescription, roles.account.address)
        ).to.be.revertedWith('Role already initialized');
      });
    });
  });
  context('Caller does not have adminRole', function () {
    it('reverts', async function () {
      await expect(
        accessControlRegistry
          .connect(roles.randomPerson)
          .initializeAndGrantRole(managerRootRole, roleDescription, roles.account.address)
      ).to.be.revertedWith(
        `AccessControl: account ${roles.randomPerson.address.toLowerCase()} is missing role ${managerRootRole.toLowerCase()}`
      );
    });
  });
});

describe('managerToRoleCount', function () {
  it('returns role count of manager', async function () {
    const manager = roles.manager.address;
    expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(0);
    await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
    expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(1);
    // The manager creates a role and grants it to account
    const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
    await accessControlRegistry
      .connect(roles.manager)
      .initializeAndGrantRole(managerRootRole, roleDescription, roles.account.address);
    expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(2);
    // The account creates two additional roles under the newly created role
    await accessControlRegistry.connect(roles.account).initializeRole(role, 'Another role');
    expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(3);
    await accessControlRegistry.connect(roles.account).initializeRole(role, 'Yet another role');
    expect(await accessControlRegistry.managerToRoleCount(manager)).to.equal(4);
  });
});

describe('hasRoleOrIsManagerOfRole', function () {
  context('account has the role', function () {
    context('account is the manager of role', function () {
      context('role is the root role of the manager', function () {
        it('returns true', async function () {
          const manager = roles.manager.address;
          await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
          expect(await accessControlRegistry.hasRoleOrIsManagerOfRole(managerRootRole, manager)).to.equal(true);
        });
      });
      context('role is not the root role of the manager', function () {
        it('returns true', async function () {
          const manager = roles.manager.address;
          await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
          const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
          await accessControlRegistry
            .connect(roles.manager)
            .initializeAndGrantRole(managerRootRole, roleDescription, manager);
          expect(await accessControlRegistry.hasRoleOrIsManagerOfRole(role, manager)).to.equal(true);
        });
      });
    });
    context('account is not the manager of role', function () {
      it('returns true', async function () {
        const account = roles.account.address;
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(roles.manager.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await accessControlRegistry
          .connect(roles.manager)
          .initializeAndGrantRole(managerRootRole, roleDescription, account);
        expect(await accessControlRegistry.hasRoleOrIsManagerOfRole(role, account)).to.equal(true);
      });
    });
  });
  context('account does not have the role', function () {
    context('account is the manager of role', function () {
      it('returns true', async function () {
        const manager = roles.manager.address;
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription);
        expect(await accessControlRegistry.hasRoleOrIsManagerOfRole(role, manager)).to.equal(true);
      });
    });
    context('account is not the manager of role', function () {
      it('returns false', async function () {
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(roles.manager.address);
        expect(
          await accessControlRegistry.hasRoleOrIsManagerOfRole(managerRootRole, roles.randomPerson.address)
        ).to.equal(false);
      });
    });
  });
});

describe('deriveRootRole', function () {
  it('derives root role of manager by left-padding its address with zeros', async function () {
    expect(await accessControlRegistry.deriveRootRole(roles.manager.address)).to.equal(
      hre.ethers.utils.hexZeroPad(roles.manager.address, 32).toLowerCase()
    );
  });
});

describe('deriveRole', function () {
  it('derives role by hashing the adminRole and description', async function () {
    expect(await accessControlRegistry.deriveRole(managerRootRole, roleDescription)).to.equal(
      hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['bytes32', 'string'], [managerRootRole, roleDescription])
      )
    );
  });
});
