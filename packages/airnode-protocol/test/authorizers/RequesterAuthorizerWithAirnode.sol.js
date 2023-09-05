const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

describe('RequesterAuthorizerWithAirnode', function () {
  let roles;
  let accessControlRegistry, requesterAuthorizerWithAirnode;
  let requesterAuthorizerWithAirnodeAdminRoleDescription = 'RequesterAuthorizerWithAirnode admin';
  let adminRole, whitelistExpirationExtenderRole, whitelistExpirationSetterRole, indefiniteWhitelisterRole;
  let airnodeAddress, airnodeMnemonic, airnodeWallet;
  let endpointId = utils.generateRandomBytes32();

  beforeEach(async () => {
    const accounts = await hre.ethers.getSigners();
    roles = {
      deployer: accounts[0],
      whitelistExpirationExtender: accounts[1],
      whitelistExpirationSetter: accounts[2],
      indefiniteWhitelister: accounts[3],
      anotherIndefiniteWhitelister: accounts[4],
      requester: accounts[5],
      randomPerson: accounts[9],
    };
    const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
    accessControlRegistry = await accessControlRegistryFactory.deploy();
    const requesterAuthorizerWithAirnodeFactory = await hre.ethers.getContractFactory(
      'RequesterAuthorizerWithAirnode',
      roles.deployer
    );
    requesterAuthorizerWithAirnode = await requesterAuthorizerWithAirnodeFactory.deploy(
      accessControlRegistry.address,
      requesterAuthorizerWithAirnodeAdminRoleDescription
    );
    ({ airnodeAddress: airnodeAddress, airnodeMnemonic: airnodeMnemonic } = utils.generateRandomAirnodeWallet());
    await roles.deployer.sendTransaction({
      to: airnodeAddress,
      value: hre.ethers.utils.parseEther('1'),
    });
    airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);
    const airnodeRootRole = await accessControlRegistry.deriveRootRole(airnodeAddress);
    // Initialize the roles and grant them to respective accounts
    adminRole = await requesterAuthorizerWithAirnode.deriveAdminRole(airnodeAddress);
    await accessControlRegistry
      .connect(airnodeWallet)
      .initializeRoleAndGrantToSender(airnodeRootRole, requesterAuthorizerWithAirnodeAdminRoleDescription, {
        gasLimit: 1000000,
      });
    whitelistExpirationExtenderRole =
      await requesterAuthorizerWithAirnode.deriveWhitelistExpirationExtenderRole(airnodeAddress);
    await accessControlRegistry
      .connect(airnodeWallet)
      .initializeRoleAndGrantToSender(
        adminRole,
        await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
        { gasLimit: 1000000 }
      );
    await accessControlRegistry
      .connect(airnodeWallet)
      .grantRole(whitelistExpirationExtenderRole, roles.whitelistExpirationExtender.address, { gasLimit: 1000000 });
    whitelistExpirationSetterRole =
      await requesterAuthorizerWithAirnode.deriveWhitelistExpirationSetterRole(airnodeAddress);
    await accessControlRegistry
      .connect(airnodeWallet)
      .initializeRoleAndGrantToSender(
        adminRole,
        await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
        { gasLimit: 1000000 }
      );
    await accessControlRegistry
      .connect(airnodeWallet)
      .grantRole(whitelistExpirationSetterRole, roles.whitelistExpirationSetter.address, { gasLimit: 1000000 });
    indefiniteWhitelisterRole = await requesterAuthorizerWithAirnode.deriveIndefiniteWhitelisterRole(airnodeAddress);
    await accessControlRegistry
      .connect(airnodeWallet)
      .initializeRoleAndGrantToSender(
        adminRole,
        await requesterAuthorizerWithAirnode.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
        { gasLimit: 1000000 }
      );
    await accessControlRegistry
      .connect(airnodeWallet)
      .grantRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address, { gasLimit: 1000000 });
    await accessControlRegistry
      .connect(airnodeWallet)
      .grantRole(indefiniteWhitelisterRole, roles.anotherIndefiniteWhitelister.address, { gasLimit: 1000000 });
    // Grant `roles.randomPerson` some invalid roles
    const randomRoleDescription = Math.random().toString();
    const randomRole = await accessControlRegistry.deriveRole(airnodeRootRole, randomRoleDescription);
    await accessControlRegistry
      .connect(airnodeWallet)
      .initializeRoleAndGrantToSender(airnodeRootRole, randomRoleDescription, { gasLimit: 1000000 });
    await accessControlRegistry
      .connect(airnodeWallet)
      .grantRole(randomRole, roles.randomPerson.address, { gasLimit: 1000000 });
    const invalidWhitelistExpirationExtenderRole = await accessControlRegistry.deriveRole(
      airnodeRootRole,
      await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION()
    );
    await accessControlRegistry
      .connect(airnodeWallet)
      .initializeRoleAndGrantToSender(
        airnodeRootRole,
        await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
        { gasLimit: 1000000 }
      );
    await accessControlRegistry
      .connect(airnodeWallet)
      .grantRole(invalidWhitelistExpirationExtenderRole, roles.randomPerson.address, { gasLimit: 1000000 });
    const invalidWhitelistExpirationSetterRole = await accessControlRegistry.deriveRole(
      airnodeRootRole,
      await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION()
    );
    await accessControlRegistry
      .connect(airnodeWallet)
      .initializeRoleAndGrantToSender(
        airnodeRootRole,
        await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
        { gasLimit: 1000000 }
      );
    await accessControlRegistry
      .connect(airnodeWallet)
      .grantRole(invalidWhitelistExpirationSetterRole, roles.randomPerson.address, { gasLimit: 1000000 });
    const invalidIndefiniteWhitelisterRole = await accessControlRegistry.deriveRole(
      airnodeRootRole,
      await requesterAuthorizerWithAirnode.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION()
    );
    await accessControlRegistry
      .connect(airnodeWallet)
      .initializeRoleAndGrantToSender(
        airnodeRootRole,
        await requesterAuthorizerWithAirnode.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
        { gasLimit: 1000000 }
      );
    await accessControlRegistry
      .connect(airnodeWallet)
      .grantRole(invalidIndefiniteWhitelisterRole, roles.randomPerson.address, { gasLimit: 1000000 });
  });

  describe('constructor', function () {
    context('AccessControlRegistry address is not zero', function () {
      context('Admin role description string is not empty', function () {
        it('constructs', async function () {
          const requesterAuthorizerWithAirnodeFactory = await hre.ethers.getContractFactory(
            'RequesterAuthorizerWithAirnode',
            roles.deployer
          );
          requesterAuthorizerWithAirnode = await requesterAuthorizerWithAirnodeFactory.deploy(
            accessControlRegistry.address,
            requesterAuthorizerWithAirnodeAdminRoleDescription
          );
          expect(await requesterAuthorizerWithAirnode.accessControlRegistry()).to.equal(accessControlRegistry.address);
          expect(await requesterAuthorizerWithAirnode.adminRoleDescription()).to.equal(
            requesterAuthorizerWithAirnodeAdminRoleDescription
          );
        });
      });
      context('Admin role description string is empty', function () {
        it('reverts', async function () {
          const requesterAuthorizerWithAirnodeFactory = await hre.ethers.getContractFactory(
            'RequesterAuthorizerWithAirnode',
            roles.deployer
          );
          await expect(
            requesterAuthorizerWithAirnodeFactory.deploy(accessControlRegistry.address, '')
          ).to.be.revertedWith('Admin role description empty');
        });
      });
    });
    context('AccessControlRegistry address is zero', function () {
      it('reverts', async function () {
        const requesterAuthorizerWithAirnodeFactory = await hre.ethers.getContractFactory(
          'RequesterAuthorizerWithAirnode',
          roles.deployer
        );
        await expect(
          requesterAuthorizerWithAirnodeFactory.deploy(
            hre.ethers.constants.AddressZero,
            requesterAuthorizerWithAirnodeAdminRoleDescription
          )
        ).to.be.revertedWith('ACR address zero');
      });
    });
  });

  describe('extendWhitelistExpiration', function () {
    context('Sender has whitelist expiration extender role', function () {
      context('Requester address not zero', function () {
        context('Timestamp extends whitelist expiration', function () {
          it('extends whitelist expiration', async function () {
            let whitelistStatus;
            whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address
            );
            expect(whitelistStatus.expirationTimestamp).to.equal(0);
            expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
            const expirationTimestamp = 1000;
            await expect(
              requesterAuthorizerWithAirnode
                .connect(roles.whitelistExpirationExtender)
                .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
            )
              .to.emit(requesterAuthorizerWithAirnode, 'ExtendedWhitelistExpiration')
              .withArgs(
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.whitelistExpirationExtender.address,
                expirationTimestamp
              );
            whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
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
              requesterAuthorizerWithAirnode
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
            requesterAuthorizerWithAirnode
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
    context('Sender is the Airnode address', function () {
      context('Timestamp extends whitelist expiration', function () {
        it('extends whitelist expiration', async function () {
          await accessControlRegistry
            .connect(airnodeWallet)
            .renounceRole(whitelistExpirationExtenderRole, airnodeAddress, { gasLimit: 1000000 });
          let whitelistStatus;
          whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          const expirationTimestamp = 1000;
          await expect(
            requesterAuthorizerWithAirnode
              .connect(airnodeWallet)
              .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp, {
                gasLimit: 1000000,
              })
          )
            .to.emit(requesterAuthorizerWithAirnode, 'ExtendedWhitelistExpiration')
            .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, expirationTimestamp);
          whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
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
            .connect(airnodeWallet)
            .renounceRole(whitelistExpirationExtenderRole, airnodeAddress, { gasLimit: 1000000 });
          await expect(
            requesterAuthorizerWithAirnode
              .connect(airnodeWallet)
              .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0, { gasLimit: 1000000 })
          ).to.be.revertedWith('Does not extend expiration');
        });
      });
    });
    context('Sender does not have the whitelist extender role and is not the Airnode address', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWithAirnode
            .connect(roles.whitelistExpirationSetter)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
        ).to.be.revertedWith('Cannot extend expiration');
        await expect(
          requesterAuthorizerWithAirnode
            .connect(roles.indefiniteWhitelister)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
        ).to.be.revertedWith('Cannot extend expiration');
        await expect(
          requesterAuthorizerWithAirnode
            .connect(roles.randomPerson)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
        ).to.be.revertedWith('Cannot extend expiration');
      });
    });
  });

  describe('setWhitelistExpiration', function () {
    context('Sender has whitelist expiration setter role', function () {
      context('Requester address not zero', function () {
        it('sets whitelist expiration', async function () {
          let whitelistStatus;
          const expirationTimestamp = 1000;
          await expect(
            requesterAuthorizerWithAirnode
              .connect(roles.whitelistExpirationSetter)
              .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
          )
            .to.emit(requesterAuthorizerWithAirnode, 'SetWhitelistExpiration')
            .withArgs(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.whitelistExpirationSetter.address,
              expirationTimestamp
            );
          whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          await expect(
            requesterAuthorizerWithAirnode
              .connect(roles.whitelistExpirationSetter)
              .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
          )
            .to.emit(requesterAuthorizerWithAirnode, 'SetWhitelistExpiration')
            .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.whitelistExpirationSetter.address, 0);
          whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
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
            requesterAuthorizerWithAirnode
              .connect(roles.whitelistExpirationSetter)
              .setWhitelistExpiration(airnodeAddress, endpointId, hre.ethers.constants.AddressZero, 0)
          ).to.be.revertedWith('Requester address zero');
        });
      });
    });
    context('Sender is the Airnode address', function () {
      it('sets whitelist expiration', async function () {
        await accessControlRegistry
          .connect(airnodeWallet)
          .renounceRole(whitelistExpirationSetterRole, airnodeAddress, { gasLimit: 1000000 });
        let whitelistStatus;
        const expirationTimestamp = 1000;
        await expect(
          requesterAuthorizerWithAirnode
            .connect(airnodeWallet)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp, {
              gasLimit: 1000000,
            })
        )
          .to.emit(requesterAuthorizerWithAirnode, 'SetWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, expirationTimestamp);
        whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        await expect(
          requesterAuthorizerWithAirnode
            .connect(airnodeWallet)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0, { gasLimit: 1000000 })
        )
          .to.emit(requesterAuthorizerWithAirnode, 'SetWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, 0);
        whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      });
    });
    context('Sender does not have the whitelist expiration setter role and is not the Airnode address', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWithAirnode
            .connect(roles.whitelistExpirationExtender)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Cannot set expiration');
        await expect(
          requesterAuthorizerWithAirnode
            .connect(roles.indefiniteWhitelister)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Cannot set expiration');
        await expect(
          requesterAuthorizerWithAirnode
            .connect(roles.randomPerson)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Cannot set expiration');
      });
    });
  });

  describe('setIndefiniteWhitelistStatus', function () {
    context('Sender has indefinite whitelister role', function () {
      context('Requester address not zero', function () {
        it('sets indefinite whitelist status', async function () {
          let whitelistStatus;
          // Whitelist indefinitely
          await expect(
            requesterAuthorizerWithAirnode
              .connect(roles.indefiniteWhitelister)
              .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
          )
            .to.emit(requesterAuthorizerWithAirnode, 'SetIndefiniteWhitelistStatus')
            .withArgs(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address,
              true,
              1
            );
          whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          expect(
            await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address
            )
          ).to.equal(true);
          // Whitelisting indefinitely again should have no effect
          await expect(
            requesterAuthorizerWithAirnode
              .connect(roles.indefiniteWhitelister)
              .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
          )
            .to.emit(requesterAuthorizerWithAirnode, 'SetIndefiniteWhitelistStatus')
            .withArgs(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address,
              true,
              1
            );
          whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          expect(
            await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address
            )
          ).to.equal(true);
          // Revoke indefinite whitelisting
          await expect(
            requesterAuthorizerWithAirnode
              .connect(roles.indefiniteWhitelister)
              .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
          )
            .to.emit(requesterAuthorizerWithAirnode, 'SetIndefiniteWhitelistStatus')
            .withArgs(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address,
              false,
              0
            );
          whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          expect(
            await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address
            )
          ).to.equal(false);
          // Revoking indefinite whitelisting again should have no effect
          await expect(
            requesterAuthorizerWithAirnode
              .connect(roles.indefiniteWhitelister)
              .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
          )
            .to.emit(requesterAuthorizerWithAirnode, 'SetIndefiniteWhitelistStatus')
            .withArgs(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address,
              false,
              0
            );
          whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          expect(
            await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
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
            requesterAuthorizerWithAirnode
              .connect(roles.indefiniteWhitelister)
              .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, hre.ethers.constants.AddressZero, true)
          ).to.be.revertedWith('Requester address zero');
        });
      });
    });
    context('Sender is the Airnode address', function () {
      it('sets indefinite whitelist status', async function () {
        await accessControlRegistry
          .connect(airnodeWallet)
          .renounceRole(indefiniteWhitelisterRole, airnodeAddress, { gasLimit: 1000000 });
        let whitelistStatus;
        // Whitelist indefinitely
        await expect(
          requesterAuthorizerWithAirnode
            .connect(airnodeWallet)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true, {
              gasLimit: 1000000,
            })
        )
          .to.emit(requesterAuthorizerWithAirnode, 'SetIndefiniteWhitelistStatus')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, true, 1);
        whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        expect(
          await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            airnodeAddress
          )
        ).to.equal(true);
        // Whitelisting indefinitely again should have no effect
        await expect(
          requesterAuthorizerWithAirnode
            .connect(airnodeWallet)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true, {
              gasLimit: 1000000,
            })
        )
          .to.emit(requesterAuthorizerWithAirnode, 'SetIndefiniteWhitelistStatus')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, true, 1);
        whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        expect(
          await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            airnodeAddress
          )
        ).to.equal(true);
        // Revoke indefinite whitelisting
        await expect(
          requesterAuthorizerWithAirnode
            .connect(airnodeWallet)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false, {
              gasLimit: 1000000,
            })
        )
          .to.emit(requesterAuthorizerWithAirnode, 'SetIndefiniteWhitelistStatus')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, false, 0);
        whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        expect(
          await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            airnodeAddress
          )
        ).to.equal(false);
        // Revoking indefinite whitelisting again should have no effect
        await expect(
          requesterAuthorizerWithAirnode
            .connect(airnodeWallet)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false, {
              gasLimit: 1000000,
            })
        )
          .to.emit(requesterAuthorizerWithAirnode, 'SetIndefiniteWhitelistStatus')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, false, 0);
        whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        expect(
          await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            airnodeAddress
          )
        ).to.equal(false);
      });
    });
    context('Sender does not have the indefinite whitelister role and is not the Airnode address', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWithAirnode
            .connect(roles.whitelistExpirationExtender)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
        ).to.be.revertedWith('Cannot set indefinite status');
        await expect(
          requesterAuthorizerWithAirnode
            .connect(roles.whitelistExpirationSetter)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
        ).to.be.revertedWith('Cannot set indefinite status');
        await expect(
          requesterAuthorizerWithAirnode
            .connect(roles.randomPerson)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
        ).to.be.revertedWith('Cannot set indefinite status');
      });
    });
  });

  describe('revokeIndefiniteWhitelistStatus', function () {
    context('setter does not have the indefinite whitelister role', function () {
      context('setter is not the Airnode address', function () {
        context('Airnode address not zero', function () {
          context('Requester address not zero', function () {
            context('Setter address not zero', function () {
              it('revokes indefinite whitelist status', async function () {
                // Grant indefinite whitelist status
                await requesterAuthorizerWithAirnode
                  .connect(roles.indefiniteWhitelister)
                  .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
                // Revoke the indefinite whitelister role
                await accessControlRegistry
                  .connect(airnodeWallet)
                  .revokeRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address, { gasLimit: 1000000 });
                // Revoke the indefinite whitelist status
                await expect(
                  requesterAuthorizerWithAirnode
                    .connect(roles.randomPerson)
                    .revokeIndefiniteWhitelistStatus(
                      airnodeAddress,
                      endpointId,
                      roles.requester.address,
                      roles.indefiniteWhitelister.address
                    )
                )
                  .to.emit(requesterAuthorizerWithAirnode, 'RevokedIndefiniteWhitelistStatus')
                  .withArgs(
                    airnodeAddress,
                    endpointId,
                    roles.requester.address,
                    roles.indefiniteWhitelister.address,
                    roles.randomPerson.address,
                    0
                  );
                const whitelistStatus =
                  await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
                    airnodeAddress,
                    endpointId,
                    roles.requester.address
                  );
                expect(whitelistStatus.expirationTimestamp).to.equal(0);
                expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                // Revoking twice should not emit an event
                await expect(
                  requesterAuthorizerWithAirnode
                    .connect(roles.randomPerson)
                    .revokeIndefiniteWhitelistStatus(
                      airnodeAddress,
                      endpointId,
                      roles.requester.address,
                      roles.indefiniteWhitelister.address
                    )
                ).to.not.emit(requesterAuthorizerWithAirnode, 'RevokedIndefiniteWhitelistStatus');
              });
            });
            context('Setter address zero', function () {
              it('reverts', async function () {
                await expect(
                  requesterAuthorizerWithAirnode
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
                requesterAuthorizerWithAirnode
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
              requesterAuthorizerWithAirnode
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
      context('setter is the Airnode address', function () {
        it('reverts', async function () {
          await accessControlRegistry
            .connect(airnodeWallet)
            .renounceRole(indefiniteWhitelisterRole, airnodeAddress, { gasLimit: 1000000 });
          await expect(
            requesterAuthorizerWithAirnode
              .connect(roles.randomPerson)
              .revokeIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, airnodeAddress)
          ).to.be.revertedWith('setter can set indefinite status');
        });
      });
    });
    context('setter has the indefinite whitelister role', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWithAirnode
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

  describe('deriveAdminRole', function () {
    it('derives admin role for the Airnode', async function () {
      expect(await requesterAuthorizerWithAirnode.deriveAdminRole(airnodeAddress)).to.equal(adminRole);
    });
  });

  describe('deriveWhitelistExpirationExtenderRole', function () {
    it('derives whitelist expiration extender role for the Airnode', async function () {
      expect(await requesterAuthorizerWithAirnode.deriveWhitelistExpirationExtenderRole(airnodeAddress)).to.equal(
        whitelistExpirationExtenderRole
      );
    });
  });

  describe('deriveWhitelistExpirationSetterRole', function () {
    it('derives whitelist expiration setter role for the Airnode', async function () {
      expect(await requesterAuthorizerWithAirnode.deriveWhitelistExpirationSetterRole(airnodeAddress)).to.equal(
        whitelistExpirationSetterRole
      );
    });
  });

  describe('deriveIndefiniteWhitelisterRole', function () {
    it('derives indefinite whitelister role for the Airnode', async function () {
      expect(await requesterAuthorizerWithAirnode.deriveIndefiniteWhitelisterRole(airnodeAddress)).to.equal(
        indefiniteWhitelisterRole
      );
    });
  });

  describe('isAuthorized', function () {
    context('Requester is whitelisted indefinitely', function () {
      context('Requester is whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithAirnode
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
          await requesterAuthorizerWithAirnode
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
          expect(
            await requesterAuthorizerWithAirnode.isAuthorized(airnodeAddress, endpointId, roles.requester.address)
          ).to.equal(true);
        });
      });
      context('Requester is not whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithAirnode
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
          expect(
            await requesterAuthorizerWithAirnode.isAuthorized(airnodeAddress, endpointId, roles.requester.address)
          ).to.equal(true);
        });
      });
    });
    context('Requester is not whitelisted indefinitely', function () {
      context('Requester is whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithAirnode
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
          expect(
            await requesterAuthorizerWithAirnode.isAuthorized(airnodeAddress, endpointId, roles.requester.address)
          ).to.equal(true);
        });
      });
      context('Requester is not whitelisted temporarily', function () {
        it('returns false', async function () {
          expect(
            await requesterAuthorizerWithAirnode.isAuthorized(airnodeAddress, endpointId, roles.requester.address)
          ).to.equal(false);
        });
      });
    });
  });

  describe('isAuthorizedV0', function () {
    context('Requester is whitelisted indefinitely', function () {
      context('Requester is whitelisted temporarily', function () {
        it('returns true', async function () {
          await requesterAuthorizerWithAirnode
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
          await requesterAuthorizerWithAirnode
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
          expect(
            await requesterAuthorizerWithAirnode.isAuthorizedV0(
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
          await requesterAuthorizerWithAirnode
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
          expect(
            await requesterAuthorizerWithAirnode.isAuthorizedV0(
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
          await requesterAuthorizerWithAirnode
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
          expect(
            await requesterAuthorizerWithAirnode.isAuthorizedV0(
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
            await requesterAuthorizerWithAirnode.isAuthorizedV0(
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
