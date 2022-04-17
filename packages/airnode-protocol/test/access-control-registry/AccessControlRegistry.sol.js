const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../utils');

describe('AccessControlRegistry', function () {
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
    roleDescription = 'Role description unique to admin role';
  });

  describe('initializeManager', function () {
    context('Manager address is not zero', function () {
      context('Manager is not initialized', function () {
        it('initializes manager', async function () {
          const manager = roles.manager.address;
          expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(false);
          await expect(accessControlRegistry.connect(roles.randomPerson).initializeManager(manager))
            .to.emit(accessControlRegistry, 'InitializedManager')
            .withArgs(managerRootRole, manager);
          expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(true);
        });
      });
      context('Manager is initialized', function () {
        it('does nothing', async function () {
          const manager = roles.manager.address;
          await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
          expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(true);
          await expect(accessControlRegistry.connect(roles.randomPerson).initializeManager(manager)).to.not.emit(
            accessControlRegistry,
            'InitializedManager'
          );
          expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(true);
        });
      });
    });
    context('Manager address is zero', function () {
      it('reverts', async function () {
        await expect(
          accessControlRegistry.connect(roles.randomPerson).initializeManager(hre.ethers.constants.AddressZero)
        ).to.be.revertedWith('Manager address zero');
      });
    });
  });

  // Not testing the OpenZeppelin implementation
  describe('renounceRole', function () {
    context('role is not the root role of account', function () {
      context('Sender is account', function () {
        context('account has role', function () {
          it('renounces role', async function () {
            const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
            await accessControlRegistry
              .connect(roles.manager)
              .initializeRoleAndGrantToSender(managerRootRole, roleDescription);
            await accessControlRegistry.connect(roles.manager).grantRole(role, roles.account.address);
            expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(true);
            await expect(accessControlRegistry.connect(roles.account).renounceRole(role, roles.account.address))
              .to.emit(accessControlRegistry, 'RoleRevoked')
              .withArgs(role, roles.account.address, roles.account.address);
            expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(false);
          });
        });
        context('account does not have role', function () {
          it('does nothing', async function () {
            const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
            await expect(
              accessControlRegistry.connect(roles.randomPerson).renounceRole(role, roles.randomPerson.address)
            ).to.not.emit(accessControlRegistry, 'RoleRevoked');
          });
        });
      });
      context('Sender is not account', function () {
        it('reverts', async function () {
          const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
          await expect(
            accessControlRegistry.connect(roles.randomPerson).renounceRole(role, roles.manager.address)
          ).to.be.revertedWith('AccessControl: can only renounce roles for self');
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

  describe('initializeRoleAndGrantToSender', function () {
    context('description not empty', function () {
      context('Role is not initialized', function () {
        context('adminRole is the root role of the sender', function () {
          context('Sender manager is initialized', function () {
            it('initializes role and grants it to the sender', async function () {
              const manager = roles.manager.address;
              await accessControlRegistry.connect(roles.randomPerson).initializeManager(manager);
              const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
              expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(hre.ethers.constants.HashZero);
              expect(await accessControlRegistry.hasRole(role, manager)).to.equal(false);
              await expect(
                accessControlRegistry
                  .connect(roles.manager)
                  .initializeRoleAndGrantToSender(managerRootRole, roleDescription)
              )
                .to.emit(accessControlRegistry, 'InitializedRole')
                .withArgs(role, managerRootRole, roleDescription, manager);
              expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
              expect(await accessControlRegistry.hasRole(role, manager)).to.equal(true);
            });
          });
          context('Sender manager is not initialized', function () {
            it('initializes sender manager, role and grants it to the sender', async function () {
              const manager = roles.manager.address;
              const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
              expect(await accessControlRegistry.hasRole(managerRootRole, manager)).to.equal(false);
              expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(hre.ethers.constants.HashZero);
              expect(await accessControlRegistry.hasRole(role, manager)).to.equal(false);
              await expect(
                accessControlRegistry
                  .connect(roles.manager)
                  .initializeRoleAndGrantToSender(managerRootRole, roleDescription)
              )
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
              const role1 = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
              const role2 = await accessControlRegistry.deriveRole(role1, roleDescription);
              await accessControlRegistry
                .connect(roles.manager)
                .initializeRoleAndGrantToSender(managerRootRole, roleDescription);
              await accessControlRegistry.connect(roles.manager).grantRole(role1, account);
              expect(await accessControlRegistry.getRoleAdmin(role2)).to.equal(hre.ethers.constants.HashZero);
              expect(await accessControlRegistry.hasRole(role2, manager)).to.equal(false);
              expect(await accessControlRegistry.hasRole(role2, account)).to.equal(false);
              await expect(
                accessControlRegistry.connect(roles.account).initializeRoleAndGrantToSender(role1, roleDescription)
              )
                .to.emit(accessControlRegistry, 'InitializedRole')
                .withArgs(role2, role1, roleDescription, account);
              expect(await accessControlRegistry.getRoleAdmin(role2)).to.equal(role1);
              expect(await accessControlRegistry.hasRole(role2, account)).to.equal(true);
              // The role didn't propagate to the manager
              expect(await accessControlRegistry.hasRole(role2, manager)).to.equal(false);
            });
          });
          context('Sender does not have adminRole', function () {
            it('reverts', async function () {
              await expect(
                accessControlRegistry
                  .connect(roles.randomPerson)
                  .initializeRoleAndGrantToSender(managerRootRole, roleDescription)
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
            await accessControlRegistry
              .connect(roles.manager)
              .initializeRoleAndGrantToSender(managerRootRole, roleDescription);
            await accessControlRegistry.connect(roles.manager).renounceRole(role, manager);
            expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
            expect(await accessControlRegistry.hasRole(role, manager)).to.equal(false);
            await expect(
              accessControlRegistry
                .connect(roles.manager)
                .initializeRoleAndGrantToSender(managerRootRole, roleDescription)
            )
              .to.emit(accessControlRegistry, 'RoleGranted')
              .withArgs(role, roles.manager.address, roles.manager.address);
            await expect(
              accessControlRegistry
                .connect(roles.manager)
                .initializeRoleAndGrantToSender(managerRootRole, roleDescription)
            ).to.not.emit(accessControlRegistry, 'InitializedRole');
            expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
            expect(await accessControlRegistry.hasRole(role, manager)).to.equal(true);
          });
        });
        context('Sender does not have adminRole', function () {
          it('reverts', async function () {
            await expect(
              accessControlRegistry
                .connect(roles.randomPerson)
                .initializeRoleAndGrantToSender(managerRootRole, roleDescription)
            ).to.be.revertedWith(
              `AccessControl: account ${roles.randomPerson.address.toLowerCase()} is missing role ${managerRootRole.toLowerCase()}`
            );
          });
        });
      });
    });
    context('description empty', function () {
      it('reverts', async function () {
        await expect(
          accessControlRegistry.connect(roles.manager).initializeRoleAndGrantToSender(managerRootRole, '')
        ).to.be.revertedWith('Role description empty');
      });
    });
  });

  describe('deriveRootRole', function () {
    it('derives root role by hashing the manager address', async function () {
      expect(await accessControlRegistry.deriveRootRole(roles.manager.address)).to.equal(managerRootRole);
    });
  });

  describe('deriveRole', function () {
    it('derives role by hashing the admin role and the description hash', async function () {
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

  describe('Initialize complex access control tables through Multicall', function () {
    context('Sender is authorized', function () {
      context('Calls are ordered correctly', function () {
        context('Roles to be initialized are on the same level', function () {
          it('initializes and grants roles', async function () {
            const manager = roles.manager.address;
            const descriptions = Array(32)
              .fill()
              .map(() => Math.random().toString());
            const accounts = Array(32)
              .fill()
              .map(() => testUtils.generateRandomAddress());
            const calldatas = [];
            for (let ind = 0; ind < descriptions.length; ind++) {
              const role = await accessControlRegistry.deriveRole(managerRootRole, descriptions[ind]);
              calldatas.push(
                accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
                  managerRootRole,
                  descriptions[ind],
                ])
              );
              calldatas.push(accessControlRegistry.interface.encodeFunctionData('grantRole', [role, accounts[ind]]));
            }
            await accessControlRegistry.connect(roles.manager).multicall(calldatas);
            for (let ind = 0; ind < descriptions.length; ind++) {
              const role = await accessControlRegistry.deriveRole(managerRootRole, descriptions[ind]);
              expect(await accessControlRegistry.getRoleAdmin(role)).to.equal(managerRootRole);
              expect(await accessControlRegistry.hasRole(role, manager)).to.equal(true);
              expect(await accessControlRegistry.hasRole(role, accounts[ind])).to.equal(true);
            }
          });
        });
        context('Roles to be initialized form a tree', function () {
          it('initializes and grants roles', async function () {
            const manager = roles.manager.address;
            const description1 = Math.random().toString();
            const role1 = await accessControlRegistry.deriveRole(managerRootRole, description1);
            const account1 = testUtils.generateRandomAddress();
            const description11 = Math.random().toString();
            const role11 = await accessControlRegistry.deriveRole(role1, description11);
            const account11 = testUtils.generateRandomAddress();
            const description12 = Math.random().toString();
            const role12 = await accessControlRegistry.deriveRole(role1, description12);
            const account12 = testUtils.generateRandomAddress();
            expect(await accessControlRegistry.getRoleAdmin(role1)).to.equal(hre.ethers.constants.HashZero);
            expect(await accessControlRegistry.hasRole(role1, manager)).to.equal(false);
            expect(await accessControlRegistry.hasRole(role1, account1)).to.equal(false);
            expect(await accessControlRegistry.getRoleAdmin(role11)).to.equal(hre.ethers.constants.HashZero);
            expect(await accessControlRegistry.hasRole(role11, manager)).to.equal(false);
            expect(await accessControlRegistry.hasRole(role11, account11)).to.equal(false);
            expect(await accessControlRegistry.getRoleAdmin(role12)).to.equal(hre.ethers.constants.HashZero);
            expect(await accessControlRegistry.hasRole(role12, manager)).to.equal(false);
            expect(await accessControlRegistry.hasRole(role12, account12)).to.equal(false);
            const calldatas = [
              accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
                managerRootRole,
                description1,
              ]),
              accessControlRegistry.interface.encodeFunctionData('grantRole', [role1, account1]),
              accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
                role1,
                description11,
              ]),
              accessControlRegistry.interface.encodeFunctionData('grantRole', [role11, account11]),
              accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
                role1,
                description12,
              ]),
              accessControlRegistry.interface.encodeFunctionData('grantRole', [role12, account12]),
            ];
            await accessControlRegistry.connect(roles.manager).multicall(calldatas);
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
      });
      context('Calls are not ordered correctly', function () {
        it('reverts', async function () {
          const descriptions = Array(32)
            .fill()
            .map(() => Math.random().toString());
          const accounts = Array(32)
            .fill()
            .map(() => testUtils.generateRandomAddress());
          const calldatas = [];
          for (let ind = 0; ind < descriptions.length; ind++) {
            const role = await accessControlRegistry.deriveRole(managerRootRole, descriptions[ind]);
            // Attempt to grant roles before initializing them
            calldatas.push(accessControlRegistry.interface.encodeFunctionData('grantRole', [role, accounts[ind]]));
            calldatas.push(
              accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
                managerRootRole,
                descriptions[ind],
              ])
            );
          }
          await expect(accessControlRegistry.connect(roles.manager).multicall(calldatas)).to.be.reverted;
        });
      });
    });
    context('Sender is not authorized', function () {
      it('reverts', async function () {
        const calldata = accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
          managerRootRole,
          Math.random().toString(),
        ]);
        await expect(accessControlRegistry.connect(roles.randomPerson).multicall([calldata])).to.be.reverted;
      });
    });
  });

  describe('Make multiple static calls through Multicall', function () {
    it('returns the results of static calls', async function () {
      const description1 = Math.random().toString();
      const role1 = await accessControlRegistry.deriveRole(managerRootRole, description1);
      const account1 = testUtils.generateRandomAddress();
      const description11 = Math.random().toString();
      const role11 = await accessControlRegistry.deriveRole(role1, description11);
      const account11 = testUtils.generateRandomAddress();
      const description12 = Math.random().toString();
      const role12 = await accessControlRegistry.deriveRole(role1, description12);
      const account12 = testUtils.generateRandomAddress();
      const calldatas = [
        accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
          managerRootRole,
          description1,
        ]),
        accessControlRegistry.interface.encodeFunctionData('grantRole', [role1, account1]),
        accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [role1, description11]),
        accessControlRegistry.interface.encodeFunctionData('grantRole', [role11, account11]),
        accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [role1, description12]),
        accessControlRegistry.interface.encodeFunctionData('grantRole', [role12, account12]),
      ];
      await accessControlRegistry.connect(roles.manager).multicall(calldatas);
      const staticCalldatas = [
        accessControlRegistry.interface.encodeFunctionData('getRoleAdmin', [role1]),
        accessControlRegistry.interface.encodeFunctionData('getRoleAdmin', [role11]),
        accessControlRegistry.interface.encodeFunctionData('getRoleAdmin', [role12]),
      ];
      expect(await accessControlRegistry.callStatic.multicall(staticCalldatas)).to.deep.equal([
        managerRootRole,
        role1,
        role1,
      ]);
    });
  });
});
