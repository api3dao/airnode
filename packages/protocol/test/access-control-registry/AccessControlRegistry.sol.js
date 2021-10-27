/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

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
  managerRootRole = hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['address'], [roles.manager.address]));
  roleDescription = 'Role description unique to adminRole';
});

describe('initializeManager', function () {
  context('Manager is not initialized', function () {
    it('initializes manager', async function () {
      const manager = roles.manager.address;
      expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(false);
      await expect(accessControlRegistry.connect(roles.randomPerson).initializeManager(manager))
        .to.emit(accessControlRegistry, 'InitializedManager')
        .withArgs(manager, managerRootRole);
      expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(true);
    });
  });
  context('Manager initialized', function () {
    it('does nothing', async function () {
      const manager = roles.manager.address;
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
      await expect(accessControlRegistry.connect(roles.randomPerson).initializeManager(manager)).to.not.be.reverted;
    });
  });
});

// Not testing the OpenZeppelin implementation
describe('renounceRole', function () {
  context('role is not the root role of account', function () {
    context('account has role', function () {
      context('Sender is account', function () {
        it('renounces role', async function () {
          await accessControlRegistry.connect(roles.randomPerson).initializeManager(roles.manager.address);
          const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
          expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(false);
          await accessControlRegistry
            .connect(roles.manager)
            .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address]);
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
  context('Role is not initialized', function () {
    context('adminRole is the root role of the sender', function () {
      context('Sender manager is initialized', function () {
        it('initializes role', async function () {
          const manager = roles.manager.address;
          await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
          const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
          expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(hre.ethers.constants.HashZero);
          expect(await accessControlRegistry.hasRole(role, manager)).to.equal(false);
          await expect(accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription))
            .to.emit(accessControlRegistry, 'InitializedRole')
            .withArgs(role, managerRootRole, roleDescription, manager);
          expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
          expect(await accessControlRegistry.hasRole(role, manager)).to.equal(true);
        });
      });
      context('Sender manager is not initialized', function () {
        it('initializes sender manager and role', async function () {
          const manager = roles.manager.address;
          const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
          expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(false);
          expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(hre.ethers.constants.HashZero);
          expect(await accessControlRegistry.hasRole(role, manager)).to.equal(false);
          await expect(accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription))
            .to.emit(accessControlRegistry, 'InitializedRole')
            .withArgs(role, managerRootRole, roleDescription, manager);
          expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(true);
          expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
          expect(await accessControlRegistry.hasRole(role, manager)).to.equal(true);
        });
      });
    });
    context('adminRole is not the root role of the sender', function () {
      context('Sender has adminRole', function () {
        it('initializes role', async function () {
          const manager = roles.manager.address;
          const account = roles.account.address;
          await accessControlRegistry
            .connect(roles.manager)
            .initializeAndGrantRoles([managerRootRole], [roleDescription], [roles.account.address]);
          const role1 = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
          const role2 = await accessControlRegistry.deriveRole(role1, roleDescription);
          expect(await accessControlRegistry.getRoleAdmin(role2)).to.equal(hre.ethers.constants.HashZero);
          expect(await accessControlRegistry.hasRole(role2, manager)).to.equal(false);
          expect(await accessControlRegistry.hasRole(role2, account)).to.equal(false);
          await expect(accessControlRegistry.connect(roles.account).initializeRole(role1, roleDescription))
            .to.emit(accessControlRegistry, 'InitializedRole')
            .withArgs(role2, role1, roleDescription, account);
          expect(await accessControlRegistry.getRoleAdmin(role2)).to.equal(role1);
          // The role didn't propagate to the manager
          expect(await accessControlRegistry.hasRole(role2, manager)).to.equal(false);
          expect(await accessControlRegistry.hasRole(role2, account)).to.equal(true);
        });
      });
      context('Sender does not have adminRole', function () {
        it('reverts', async function () {
          await expect(
            accessControlRegistry.connect(roles.randomPerson).initializeRole(managerRootRole, roleDescription)
          ).to.be.revertedWith(
            `AccessControl: account ${roles.randomPerson.address.toLowerCase()} is missing role ${managerRootRole.toLowerCase()}`
          );
        });
      });
    });
  });
  context('Role is initialized', function () {
    context('Sender has adminRole', function () {
      it('grants role to sender', async function () {
        const manager = roles.manager.address;
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription);
        await accessControlRegistry.connect(roles.manager).renounceRole(role, manager);
        expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
        expect(await accessControlRegistry.hasRole(role, manager)).to.equal(false);
        await expect(
          accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription)
        ).to.not.be.reverted;
        expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
        expect(await accessControlRegistry.hasRole(role, manager)).to.equal(true);
      });
    });
    context('Sender does not have adminRole', function () {
      it('reverts', async function () {
        await accessControlRegistry.connect(roles.manager).initializeRole(managerRootRole, roleDescription);
        await expect(
          accessControlRegistry.connect(roles.randomPerson).initializeRole(managerRootRole, roleDescription)
        ).to.be.revertedWith(
          `AccessControl: account ${roles.randomPerson.address.toLowerCase()} is missing role ${managerRootRole.toLowerCase()}`
        );
      });
    });
  });
});

describe('initializeAndGrantRoles', function () {
  context('Argument lengths are equal', function () {
    context('Argument lengths do not exceed 32', function () {
      context('Roles to be initialized are on the same level', function () {
        it('initializes and grants roles', async function () {
          const manager = roles.manager.address;
          const descriptions = Array(32)
            .fill()
            .map(() => Math.random());
          const accounts = Array(32)
            .fill()
            .map(() => utils.generateRandomAddress());
          for (let ind = 0; ind < descriptions.length; ind++) {
            const role = await accessControlRegistry.deriveRole(managerRootRole, descriptions[ind]);
            expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(hre.ethers.constants.HashZero);
            expect(await accessControlRegistry.hasRole(role, manager)).to.equal(false);
            expect(await accessControlRegistry.hasRole(role, accounts[ind])).to.equal(false);
          }
          await accessControlRegistry
            .connect(roles.manager)
            .initializeAndGrantRoles(Array(32).fill(managerRootRole), descriptions, accounts);
          for (let ind = 0; ind < descriptions.length; ind++) {
            const role = await accessControlRegistry.deriveRole(managerRootRole, descriptions[ind]);
            expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
            expect(await accessControlRegistry.hasRole(role, manager)).to.equal(true);
            expect(await accessControlRegistry.hasRole(role, accounts[ind])).to.equal(true);
          }
        });
      });
      context('Roles to be initialized form a tree', function () {
        context('Arguments are ordered from lower levels to higher levels', function () {
          it('initializes and grants roles', async function () {
            const manager = roles.manager.address;
            const description1 = Math.random();
            const role1 = await accessControlRegistry.deriveRole(managerRootRole, description1);
            const account1 = utils.generateRandomAddress();
            const description11 = Math.random();
            const role11 = await accessControlRegistry.deriveRole(role1, description11);
            const account11 = utils.generateRandomAddress();
            const description12 = Math.random();
            const role12 = await accessControlRegistry.deriveRole(role1, description12);
            const account12 = utils.generateRandomAddress();
            expect(await accessControlRegistry.getRoleAdmin(role1)).to.equal(hre.ethers.constants.HashZero);
            expect(await accessControlRegistry.hasRole(role1, manager)).to.equal(false);
            expect(await accessControlRegistry.hasRole(role1, account1)).to.equal(false);
            expect(await accessControlRegistry.getRoleAdmin(role11)).to.equal(hre.ethers.constants.HashZero);
            expect(await accessControlRegistry.hasRole(role11, manager)).to.equal(false);
            expect(await accessControlRegistry.hasRole(role11, account11)).to.equal(false);
            expect(await accessControlRegistry.getRoleAdmin(role12)).to.equal(hre.ethers.constants.HashZero);
            expect(await accessControlRegistry.hasRole(role12, manager)).to.equal(false);
            expect(await accessControlRegistry.hasRole(role12, account12)).to.equal(false);
            await accessControlRegistry
              .connect(roles.manager)
              .initializeAndGrantRoles(
                [managerRootRole, role1, role1],
                [description1, description11, description12],
                [account1, account11, account12]
              );
            expect(await accessControlRegistry.getRoleAdmin(role1)).to.equal(managerRootRole);
            expect(await accessControlRegistry.hasRole(role1, manager)).to.equal(true);
            expect(await accessControlRegistry.hasRole(role1, account1)).to.equal(true);
            expect(await accessControlRegistry.getRoleAdmin(role11)).to.equal(role1);
            expect(await accessControlRegistry.hasRole(role11, manager)).to.equal(true);
            expect(await accessControlRegistry.hasRole(role11, account11)).to.equal(true);
            expect(await accessControlRegistry.getRoleAdmin(role12)).to.equal(role1);
            expect(await accessControlRegistry.hasRole(role12, manager)).to.equal(true);
            expect(await accessControlRegistry.hasRole(role12, account12)).to.equal(true);
          });
        });
        context('Arguments are not ordered properly', function () {
          it('reverts', async function () {
            const description1 = Math.random();
            const role1 = await accessControlRegistry.deriveRole(managerRootRole, description1);
            const account1 = utils.generateRandomAddress();
            const description11 = Math.random();
            const account11 = utils.generateRandomAddress();
            const description12 = Math.random();
            const account12 = utils.generateRandomAddress();
            // role1 should be the first argument because it is of lower level
            await expect(
              accessControlRegistry
                .connect(roles.manager)
                .initializeAndGrantRoles(
                  [role1, role1, managerRootRole],
                  [description11, description12, description1],
                  [account11, account12, account1]
                )
            ).to.be.reverted;
            await expect(
              accessControlRegistry
                .connect(roles.manager)
                .initializeAndGrantRoles(
                  [role1, managerRootRole, role1],
                  [description11, description1, description12],
                  [account11, account1, account12]
                )
            ).to.be.reverted;
          });
        });
      });
    });
    context('Argument lengths exceed 32', function () {
      it('reverts', async function () {
        await expect(
          accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
            Array(33).fill(managerRootRole),
            Array(33)
              .fill()
              .map(() => Math.random()),
            Array(33)
              .fill()
              .map(() => utils.generateRandomAddress())
          )
        ).to.be.revertedWith('Arguments too long');
      });
    });
  });
  context('Argument lengths are not equal', function () {
    it('reverts', async function () {
      await expect(
        accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
          Array(31).fill(managerRootRole),
          Array(32)
            .fill()
            .map(() => Math.random()),
          Array(32)
            .fill()
            .map(() => utils.generateRandomAddress())
        )
      ).to.be.revertedWith('Argument length mismatch');
    });
  });
});

describe('deriveRootRole', function () {
  it('derives root role by hashing the manager address', async function () {
    expect(await accessControlRegistry.deriveRootRole(roles.manager.address)).to.equal(managerRootRole);
  });
});

describe('deriveRole', function () {
  it('derives role by hashing the adminRole and the description hash', async function () {
    expect(await accessControlRegistry.deriveRole(managerRootRole, roleDescription)).to.equal(
      hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['bytes32', 'bytes32'],
          [managerRootRole, hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['string'], [roleDescription]))]
        )
      )
    );
  });
});
