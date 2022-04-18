const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

describe('RequesterAuthorizerWithManager', function () {
  let roles;
  let accessControlRegistry, requesterAuthorizerWithManager;
  let requesterAuthorizerWithManagerAdminRoleDescription = 'RequesterAuthorizerWithManager admin';
  let adminRole, whitelistExpirationExtenderRole, whitelistExpirationSetterRole, indefiniteWhitelisterRole;
  let airnodeAddress = utils.generateRandomAddress();
  let endpointId = utils.generateRandomBytes32();

  beforeEach(async () => {
    const accounts = await hre.ethers.getSigners();
    roles = {
      deployer: accounts[0],
      manager: accounts[1],
      whitelistExpirationExtender: accounts[2],
      whitelistExpirationSetter: accounts[3],
      indefiniteWhitelister: accounts[4],
      anotherIndefiniteWhitelister: accounts[5],
      requester: accounts[5],
      randomPerson: accounts[9],
    };
    const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
    accessControlRegistry = await accessControlRegistryFactory.deploy();
    const requesterAuthorizerWithManagerFactory = await hre.ethers.getContractFactory(
      'RequesterAuthorizerWithManager',
      roles.deployer
    );
    requesterAuthorizerWithManager = await requesterAuthorizerWithManagerFactory.deploy(
      accessControlRegistry.address,
      requesterAuthorizerWithManagerAdminRoleDescription,
      roles.manager.address
    );
    const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
    // Initialize the roles and grant them to respective accounts
    adminRole = await requesterAuthorizerWithManager.adminRole();
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(managerRootRole, requesterAuthorizerWithManagerAdminRoleDescription);
    whitelistExpirationExtenderRole = await requesterAuthorizerWithManager.whitelistExpirationExtenderRole();
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(
        adminRole,
        await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION()
      );
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(whitelistExpirationExtenderRole, roles.whitelistExpirationExtender.address);
    whitelistExpirationSetterRole = await requesterAuthorizerWithManager.whitelistExpirationSetterRole();
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(
        adminRole,
        await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION()
      );
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(whitelistExpirationSetterRole, roles.whitelistExpirationSetter.address);
    indefiniteWhitelisterRole = await requesterAuthorizerWithManager.indefiniteWhitelisterRole();
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(
        adminRole,
        await requesterAuthorizerWithManager.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION()
      );
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address);
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(indefiniteWhitelisterRole, roles.anotherIndefiniteWhitelister.address);
    // Grant `roles.randomPerson` some invalid roles
    const randomRoleDescription = Math.random().toString();
    const randomRole = await accessControlRegistry.deriveRole(managerRootRole, randomRoleDescription);
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(managerRootRole, randomRoleDescription);
    await accessControlRegistry.connect(roles.manager).grantRole(randomRole, roles.randomPerson.address);
    const invalidWhitelistExpirationExtenderRole = await accessControlRegistry.deriveRole(
      managerRootRole,
      await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION()
    );
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(
        managerRootRole,
        await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION()
      );
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(invalidWhitelistExpirationExtenderRole, roles.randomPerson.address);
    const invalidWhitelistExpirationSetterRole = await accessControlRegistry.deriveRole(
      managerRootRole,
      await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION()
    );
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(
        managerRootRole,
        await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION()
      );
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(invalidWhitelistExpirationSetterRole, roles.randomPerson.address);
    const invalidIndefiniteWhitelisterRole = await accessControlRegistry.deriveRole(
      managerRootRole,
      await requesterAuthorizerWithManager.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION()
    );
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(
        managerRootRole,
        await requesterAuthorizerWithManager.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION()
      );
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(invalidIndefiniteWhitelisterRole, roles.randomPerson.address);
  });

  describe('constructor', function () {
    context('AccessControlRegistry address is not zero', function () {
      context('Admin role description string is not empty', function () {
        context('Manager address is not zero', function () {
          it('constructs', async function () {
            const requesterAuthorizerWithManagerFactory = await hre.ethers.getContractFactory(
              'RequesterAuthorizerWithManager',
              roles.deployer
            );
            requesterAuthorizerWithManager = await requesterAuthorizerWithManagerFactory.deploy(
              accessControlRegistry.address,
              requesterAuthorizerWithManagerAdminRoleDescription,
              roles.manager.address
            );
            expect(await requesterAuthorizerWithManager.accessControlRegistry()).to.equal(
              accessControlRegistry.address
            );
            expect(await requesterAuthorizerWithManager.adminRoleDescription()).to.equal(
              requesterAuthorizerWithManagerAdminRoleDescription
            );
            expect(await requesterAuthorizerWithManager.manager()).to.equal(roles.manager.address);
          });
        });
        context('Manager address is zero', function () {
          it('reverts', async function () {
            const requesterAuthorizerWithManagerFactory = await hre.ethers.getContractFactory(
              'RequesterAuthorizerWithManager',
              roles.deployer
            );
            await expect(
              requesterAuthorizerWithManagerFactory.deploy(
                accessControlRegistry.address,
                requesterAuthorizerWithManagerAdminRoleDescription,
                hre.ethers.constants.AddressZero
              )
            ).to.be.revertedWith('Manager address zero');
          });
        });
      });
      context('Admin role description string is empty', function () {
        it('reverts', async function () {
          const requesterAuthorizerWithManagerFactory = await hre.ethers.getContractFactory(
            'RequesterAuthorizerWithManager',
            roles.deployer
          );
          await expect(
            requesterAuthorizerWithManagerFactory.deploy(accessControlRegistry.address, '', roles.manager.address)
          ).to.be.revertedWith('Admin role description empty');
        });
      });
    });
    context('AccessControlRegistry address is zero', function () {
      it('reverts', async function () {
        const requesterAuthorizerWithManagerFactory = await hre.ethers.getContractFactory(
          'RequesterAuthorizerWithManager',
          roles.deployer
        );
        await expect(
          requesterAuthorizerWithManagerFactory.deploy(
            hre.ethers.constants.AddressZero,
            requesterAuthorizerWithManagerAdminRoleDescription,
            roles.manager.address
          )
        ).to.be.revertedWith('ACR address zero');
      });
    });
  });

  describe('extendWhitelistExpiration', function () {
    context('Sender has whitelist expiration extender role', function () {
      context('Airnode address not zero', function () {
        context('Requester address not zero', function () {
          context('Timestamp extends whitelist expiration', function () {
            it('extends whitelist expiration', async function () {
              let whitelistStatus;
              whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                airnodeAddress,
                endpointId,
                roles.requester.address
              );
              expect(whitelistStatus.expirationTimestamp).to.equal(0);
              expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
              const expirationTimestamp = 1000;
              await expect(
                requesterAuthorizerWithManager
                  .connect(roles.whitelistExpirationExtender)
                  .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
              )
                .to.emit(requesterAuthorizerWithManager, 'ExtendedWhitelistExpiration')
                .withArgs(
                  airnodeAddress,
                  endpointId,
                  roles.requester.address,
                  roles.whitelistExpirationExtender.address,
                  expirationTimestamp
                );
              whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                airnodeAddress,
                endpointId,
                roles.requester.address
              );
              expect(whitelistStatus.expirationTimestamp).to.equal(1000);
              expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
            });
          });
          context('Timestamp does not extend whitelist expiration', function () {
            it('reverts', async function () {
              await expect(
                requesterAuthorizerWithManager
                  .connect(roles.whitelistExpirationExtender)
                  .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
              ).to.be.revertedWith('Does not extend expiration');
            });
          });
        });
        context('Requester address zero', function () {
          it('reverts', async function () {
            const expirationTimestamp = 1000;
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.whitelistExpirationExtender)
                .extendWhitelistExpiration(
                  airnodeAddress,
                  endpointId,
                  hre.ethers.constants.AddressZero,
                  expirationTimestamp
                )
            ).to.be.revertedWith('Requester address zero');
          });
        });
      });
      context('Airnode address zero', function () {
        it('reverts', async function () {
          const expirationTimestamp = 1000;
          await expect(
            requesterAuthorizerWithManager
              .connect(roles.whitelistExpirationExtender)
              .extendWhitelistExpiration(
                hre.ethers.constants.AddressZero,
                endpointId,
                roles.requester.address,
                expirationTimestamp
              )
          ).to.be.revertedWith('Airnode address zero');
        });
      });
    });
    context('Sender is the manager address', function () {
      context('Timestamp extends whitelist expiration', function () {
        it('extends whitelist expiration', async function () {
          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(whitelistExpirationExtenderRole, roles.manager.address);
          let whitelistStatus;
          whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          const expirationTimestamp = 1000;
          await expect(
            requesterAuthorizerWithManager
              .connect(roles.manager)
              .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
          )
            .to.emit(requesterAuthorizerWithManager, 'ExtendedWhitelistExpiration')
            .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.manager.address, expirationTimestamp);
          whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(1000);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        });
      });
      context('Timestamp does not extend whitelist expiration', function () {
        it('reverts', async function () {
          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(whitelistExpirationExtenderRole, roles.manager.address);
          await expect(
            requesterAuthorizerWithManager
              .connect(roles.manager)
              .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
          ).to.be.revertedWith('Does not extend expiration');
        });
      });
    });
    context('Sender does not have the whitelist extender role and is not the manager address', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.whitelistExpirationSetter)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
        ).to.be.revertedWith('Cannot extend expiration');
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.indefiniteWhitelister)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
        ).to.be.revertedWith('Cannot extend expiration');
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.randomPerson)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
        ).to.be.revertedWith('Cannot extend expiration');
      });
    });
  });

  describe('setWhitelistExpiration', function () {
    context('Sender has whitelist expiration setter role', function () {
      context('Airnode address not zero', function () {
        context('Requester address not zero', function () {
          it('sets whitelist expiration', async function () {
            let whitelistStatus;
            const expirationTimestamp = 1000;
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.whitelistExpirationSetter)
                .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
            )
              .to.emit(requesterAuthorizerWithManager, 'SetWhitelistExpiration')
              .withArgs(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.whitelistExpirationSetter.address,
                expirationTimestamp
              );
            whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address
            );
            expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
            expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.whitelistExpirationSetter)
                .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
            )
              .to.emit(requesterAuthorizerWithManager, 'SetWhitelistExpiration')
              .withArgs(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.whitelistExpirationSetter.address,
                0
              );
            whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address
            );
            expect(whitelistStatus.expirationTimestamp).to.equal(0);
            expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          });
        });
        context('Requester address zero', function () {
          it('reverts', async function () {
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.whitelistExpirationSetter)
                .setWhitelistExpiration(airnodeAddress, endpointId, hre.ethers.constants.AddressZero, 0)
            ).to.be.revertedWith('Requester address zero');
          });
        });
      });
      context('Airnode address zero', function () {
        it('reverts', async function () {
          await expect(
            requesterAuthorizerWithManager
              .connect(roles.whitelistExpirationSetter)
              .setWhitelistExpiration(hre.ethers.constants.AddressZero, endpointId, roles.requester.address, 0)
          ).to.be.revertedWith('Airnode address zero');
        });
      });
    });
    context('Sender is tha manager address', function () {
      it('sets whitelist expiration', async function () {
        await accessControlRegistry
          .connect(roles.manager)
          .renounceRole(whitelistExpirationSetterRole, roles.manager.address);
        let whitelistStatus;
        const expirationTimestamp = 1000;
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.manager)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
        )
          .to.emit(requesterAuthorizerWithManager, 'SetWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.manager.address, expirationTimestamp);
        whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.manager)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        )
          .to.emit(requesterAuthorizerWithManager, 'SetWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.manager.address, 0);
        whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      });
    });
    context('Sender does not have the whitelist expiration setter role and is not the manager address', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.whitelistExpirationExtender)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Cannot set expiration');
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.indefiniteWhitelister)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Cannot set expiration');
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.randomPerson)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Cannot set expiration');
      });
    });
  });

  describe('setIndefiniteWhitelistStatus', function () {
    context('Sender has indefinite whitelister role', function () {
      context('Airnode address not zero', function () {
        context('Requester address not zero', function () {
          it('sets indefinite whitelist status', async function () {
            let whitelistStatus;
            // Whitelist indefinitely
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.indefiniteWhitelister)
                .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
            )
              .to.emit(requesterAuthorizerWithManager, 'SetIndefiniteWhitelistStatus')
              .withArgs(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.indefiniteWhitelister.address,
                true,
                1
              );
            whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address
            );
            expect(whitelistStatus.expirationTimestamp).to.equal(0);
            expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
            expect(
              await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.indefiniteWhitelister.address
              )
            ).to.equal(true);
            // Whitelisting indefinitely again should have no effect
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.indefiniteWhitelister)
                .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
            )
              .to.emit(requesterAuthorizerWithManager, 'SetIndefiniteWhitelistStatus')
              .withArgs(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.indefiniteWhitelister.address,
                true,
                1
              );
            whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address
            );
            expect(whitelistStatus.expirationTimestamp).to.equal(0);
            expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
            expect(
              await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.indefiniteWhitelister.address
              )
            ).to.equal(true);
            // Revoke indefinite whitelisting
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.indefiniteWhitelister)
                .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
            )
              .to.emit(requesterAuthorizerWithManager, 'SetIndefiniteWhitelistStatus')
              .withArgs(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.indefiniteWhitelister.address,
                false,
                0
              );
            whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address
            );
            expect(whitelistStatus.expirationTimestamp).to.equal(0);
            expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
            expect(
              await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.indefiniteWhitelister.address
              )
            ).to.equal(false);
            // Revoking indefinite whitelisting again should have no effect
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.indefiniteWhitelister)
                .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
            )
              .to.emit(requesterAuthorizerWithManager, 'SetIndefiniteWhitelistStatus')
              .withArgs(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.indefiniteWhitelister.address,
                false,
                0
              );
            whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address
            );
            expect(whitelistStatus.expirationTimestamp).to.equal(0);
            expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
            expect(
              await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.indefiniteWhitelister.address
              )
            ).to.equal(false);
          });
        });
        context('Requester address zero', function () {
          it('reverts', async function () {
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.indefiniteWhitelister)
                .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, hre.ethers.constants.AddressZero, true)
            ).to.be.revertedWith('Requester address zero');
          });
        });
      });
      context('Airnode address zero', function () {
        it('reverts', async function () {
          await expect(
            requesterAuthorizerWithManager
              .connect(roles.indefiniteWhitelister)
              .setIndefiniteWhitelistStatus(hre.ethers.constants.AddressZero, endpointId, roles.requester.address, true)
          ).to.be.revertedWith('Airnode address zero');
        });
      });
    });
    context('Sender is the manager address', function () {
      it('sets indefinite whitelist status', async function () {
        await accessControlRegistry
          .connect(roles.manager)
          .renounceRole(indefiniteWhitelisterRole, roles.manager.address);
        let whitelistStatus;
        // Whitelist indefinitely
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.manager)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
        )
          .to.emit(requesterAuthorizerWithManager, 'SetIndefiniteWhitelistStatus')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.manager.address, true, 1);
        whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        expect(
          await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.manager.address
          )
        ).to.equal(true);
        // Whitelisting indefinitely again should have no effect
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.manager)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
        )
          .to.emit(requesterAuthorizerWithManager, 'SetIndefiniteWhitelistStatus')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.manager.address, true, 1);
        whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        expect(
          await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.manager.address
          )
        ).to.equal(true);
        // Revoke indefinite whitelisting
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.manager)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
        )
          .to.emit(requesterAuthorizerWithManager, 'SetIndefiniteWhitelistStatus')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.manager.address, false, 0);
        whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        expect(
          await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.manager.address
          )
        ).to.equal(false);
        // Revoking indefinite whitelisting again should have no effect
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.manager)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
        )
          .to.emit(requesterAuthorizerWithManager, 'SetIndefiniteWhitelistStatus')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.manager.address, false, 0);
        whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        expect(
          await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.manager.address
          )
        ).to.equal(false);
      });
    });
    context('Sender does not have the indefinite whitelister role and is not the manager address', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.whitelistExpirationExtender)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
        ).to.be.revertedWith('Cannot set indefinite status');
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.whitelistExpirationSetter)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
        ).to.be.revertedWith('Cannot set indefinite status');
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.randomPerson)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
        ).to.be.revertedWith('Cannot set indefinite status');
      });
    });
  });

  describe('revokeIndefiniteWhitelistStatus', function () {
    context('setter does not have the indefinite whitelister role', function () {
      context('setter is not the manager address', function () {
        context('Airnode address not zero', function () {
          context('Requester address not zero', function () {
            context('Setter address not zero', function () {
              it('revokes indefinite whitelist status', async function () {
                // Grant indefinite whitelist status
                await requesterAuthorizerWithManager
                  .connect(roles.indefiniteWhitelister)
                  .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
                // Revoke the indefinite whitelister role
                await accessControlRegistry
                  .connect(roles.manager)
                  .revokeRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address);
                // Revoke the indefinite whitelist status
                await expect(
                  requesterAuthorizerWithManager
                    .connect(roles.randomPerson)
                    .revokeIndefiniteWhitelistStatus(
                      airnodeAddress,
                      endpointId,
                      roles.requester.address,
                      roles.indefiniteWhitelister.address
                    )
                )
                  .to.emit(requesterAuthorizerWithManager, 'RevokedIndefiniteWhitelistStatus')
                  .withArgs(
                    airnodeAddress,
                    endpointId,
                    roles.requester.address,
                    roles.indefiniteWhitelister.address,
                    roles.randomPerson.address,
                    0
                  );
                const whitelistStatus =
                  await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                    airnodeAddress,
                    endpointId,
                    roles.requester.address
                  );
                expect(whitelistStatus.expirationTimestamp).to.equal(0);
                expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                // Revoking twice should not emit an event
                await expect(
                  requesterAuthorizerWithManager
                    .connect(roles.randomPerson)
                    .revokeIndefiniteWhitelistStatus(
                      airnodeAddress,
                      endpointId,
                      roles.requester.address,
                      roles.indefiniteWhitelister.address
                    )
                ).to.not.emit(requesterAuthorizerWithManager, 'RevokedIndefiniteWhitelistStatus');
              });
            });
            context('Setter address zero', function () {
              it('reverts', async function () {
                await expect(
                  requesterAuthorizerWithManager
                    .connect(roles.randomPerson)
                    .revokeIndefiniteWhitelistStatus(
                      airnodeAddress,
                      endpointId,
                      roles.requester.address,
                      hre.ethers.constants.AddressZero
                    )
                ).to.be.revertedWith('Setter address zero');
              });
            });
          });
          context('Requester address zero', function () {
            it('reverts', async function () {
              await expect(
                requesterAuthorizerWithManager
                  .connect(roles.randomPerson)
                  .revokeIndefiniteWhitelistStatus(
                    airnodeAddress,
                    endpointId,
                    hre.ethers.constants.AddressZero,
                    roles.randomPerson.address
                  )
              ).to.be.revertedWith('Requester address zero');
            });
          });
        });
        context('Airnode address zero', function () {
          it('reverts', async function () {
            await expect(
              requesterAuthorizerWithManager
                .connect(roles.randomPerson)
                .revokeIndefiniteWhitelistStatus(
                  hre.ethers.constants.AddressZero,
                  endpointId,
                  roles.requester.address,
                  roles.randomPerson.address
                )
            ).to.be.revertedWith('Airnode address zero');
          });
        });
      });
      context('setter is the manager address', function () {
        it('reverts', async function () {
          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(indefiniteWhitelisterRole, roles.manager.address);
          await expect(
            requesterAuthorizerWithManager
              .connect(roles.randomPerson)
              .revokeIndefiniteWhitelistStatus(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.manager.address
              )
          ).to.be.revertedWith('setter can set indefinite status');
        });
      });
    });
    context('setter has the indefinite whitelister role', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address
            )
        ).to.be.revertedWith('setter can set indefinite status');
      });
    });
  });

  describe('isAuthorized', function () {
    context('Requester is whitelisted indefinitely', function () {
      context('Requester is whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithManager
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
          await requesterAuthorizerWithManager
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
          expect(
            await requesterAuthorizerWithManager.isAuthorized(airnodeAddress, endpointId, roles.requester.address)
          ).to.equal(true);
        });
      });
      context('Requester is not whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithManager
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
          expect(
            await requesterAuthorizerWithManager.isAuthorized(airnodeAddress, endpointId, roles.requester.address)
          ).to.equal(true);
        });
      });
    });
    context('Requester is not whitelisted indefinitely', function () {
      context('Requester is whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithManager
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
          expect(
            await requesterAuthorizerWithManager.isAuthorized(airnodeAddress, endpointId, roles.requester.address)
          ).to.equal(true);
        });
      });
      context('Requester is not whitelisted temporarily', function () {
        it('returns false', async function () {
          expect(
            await requesterAuthorizerWithManager.isAuthorized(airnodeAddress, endpointId, roles.requester.address)
          ).to.equal(false);
        });
      });
    });
  });

  describe('isAuthorizedV0', function () {
    context('Requester is whitelisted indefinitely', function () {
      context('Requester is whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithManager
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
          await requesterAuthorizerWithManager
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
          expect(
            await requesterAuthorizerWithManager.isAuthorizedV0(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.requester.address
            )
          ).to.equal(true);
        });
      });
      context('Requester is not whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithManager
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
          expect(
            await requesterAuthorizerWithManager.isAuthorizedV0(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.requester.address
            )
          ).to.equal(true);
        });
      });
    });
    context('Requester is not whitelisted indefinitely', function () {
      context('Requester is whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithManager
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
          expect(
            await requesterAuthorizerWithManager.isAuthorizedV0(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.requester.address
            )
          ).to.equal(true);
        });
      });
      context('Requester is not whitelisted temporarily', function () {
        it('returns false', async function () {
          expect(
            await requesterAuthorizerWithManager.isAuthorizedV0(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.requester.address
            )
          ).to.equal(false);
        });
      });
    });
  });
});
