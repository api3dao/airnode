const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../utils');

describe('RrpBeaconServerV0', () => {
  let roles;
  let accessControlRegistry, airnodeRrp, rrpBeaconServer;
  let rrpBeaconServerAdminRoleDescription = 'RrpBeaconServerV0 admin';
  let adminRole, whitelistExpirationExtenderRole, whitelistExpirationSetterRole, indefiniteWhitelisterRole;
  let airnodeAddress, airnodeMnemonic, airnodeXpub, airnodeWallet;
  let sponsorWalletAddress, sponsorWallet;
  let voidSignerAddressZero;
  let endpointId, templateParameters, templateId, beaconParameters, beaconId;

  beforeEach(async () => {
    const accounts = await hre.ethers.getSigners();
    roles = {
      deployer: accounts[0],
      manager: accounts[1],
      whitelistExpirationExtender: accounts[2],
      whitelistExpirationSetter: accounts[3],
      indefiniteWhitelister: accounts[4],
      anotherIndefiniteWhitelister: accounts[5],
      sponsor: accounts[6],
      updateRequester: accounts[7],
      beaconReader: accounts[8],
      randomPerson: accounts[9],
    };
    const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
    accessControlRegistry = await accessControlRegistryFactory.deploy();
    const airnodeRrpFactory = await hre.ethers.getContractFactory('AirnodeRrpV0', roles.deployer);
    airnodeRrp = await airnodeRrpFactory.deploy();
    const rrpBeaconServerFactory = await hre.ethers.getContractFactory('RrpBeaconServerV0', roles.deployer);
    rrpBeaconServer = await rrpBeaconServerFactory.deploy(
      accessControlRegistry.address,
      rrpBeaconServerAdminRoleDescription,
      roles.manager.address,
      airnodeRrp.address
    );
    const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
    // Initialize the roles and grant them to respective accounts
    adminRole = await rrpBeaconServer.adminRole();
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(managerRootRole, rrpBeaconServerAdminRoleDescription);
    whitelistExpirationExtenderRole = await rrpBeaconServer.whitelistExpirationExtenderRole();
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(
        adminRole,
        await rrpBeaconServer.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION()
      );
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(whitelistExpirationExtenderRole, roles.whitelistExpirationExtender.address);
    whitelistExpirationSetterRole = await rrpBeaconServer.whitelistExpirationSetterRole();
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(adminRole, await rrpBeaconServer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION());
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(whitelistExpirationSetterRole, roles.whitelistExpirationSetter.address);
    indefiniteWhitelisterRole = await rrpBeaconServer.indefiniteWhitelisterRole();
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(adminRole, await rrpBeaconServer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION());
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
      await rrpBeaconServer.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION()
    );
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(
        managerRootRole,
        await rrpBeaconServer.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION()
      );
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(invalidWhitelistExpirationExtenderRole, roles.randomPerson.address);
    const invalidWhitelistExpirationSetterRole = await accessControlRegistry.deriveRole(
      managerRootRole,
      await rrpBeaconServer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION()
    );
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(
        managerRootRole,
        await rrpBeaconServer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION()
      );
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(invalidWhitelistExpirationSetterRole, roles.randomPerson.address);
    const invalidIndefiniteWhitelisterRole = await accessControlRegistry.deriveRole(
      managerRootRole,
      await rrpBeaconServer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION()
    );
    await accessControlRegistry
      .connect(roles.manager)
      .initializeRoleAndGrantToSender(managerRootRole, await rrpBeaconServer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION());
    await accessControlRegistry
      .connect(roles.manager)
      .grantRole(invalidIndefiniteWhitelisterRole, roles.randomPerson.address);

    ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = utils.generateRandomAirnodeWallet());
    airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
    sponsorWalletAddress = utils.deriveSponsorWalletAddress(airnodeXpub, roles.sponsor.address);
    voidSignerAddressZero = new hre.ethers.VoidSigner(hre.ethers.constants.AddressZero, hre.ethers.provider);
    await roles.deployer.sendTransaction({
      to: sponsorWalletAddress,
      value: hre.ethers.utils.parseEther('1'),
    });
    sponsorWallet = utils.deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address).connect(hre.ethers.provider);
    endpointId = utils.generateRandomBytes32();
    templateParameters = utils.generateRandomBytes();
    await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, templateParameters);
    templateId = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, templateParameters])
    );
    beaconParameters = utils.generateRandomBytes();
    beaconId = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, beaconParameters])
    );
  });

  describe('constructor', function () {
    context('Manager address is not zero', function () {
      it('constructs', async function () {
        const rrpBeaconServerFactory = await hre.ethers.getContractFactory('RrpBeaconServerV0', roles.deployer);
        rrpBeaconServer = await rrpBeaconServerFactory.deploy(
          accessControlRegistry.address,
          rrpBeaconServerAdminRoleDescription,
          roles.manager.address,
          airnodeRrp.address
        );
        expect(await rrpBeaconServer.accessControlRegistry()).to.equal(accessControlRegistry.address);
        expect(await rrpBeaconServer.adminRoleDescription()).to.equal(rrpBeaconServerAdminRoleDescription);
        expect(await rrpBeaconServer.airnodeRrp()).to.equal(airnodeRrp.address);
        expect(await rrpBeaconServer.manager()).to.equal(roles.manager.address);
      });
    });
    context('Manager address is zero', function () {
      it('reverts', async function () {
        const rrpBeaconServerFactory = await hre.ethers.getContractFactory('RrpBeaconServerV0', roles.deployer);
        await expect(
          rrpBeaconServerFactory.deploy(
            accessControlRegistry.address,
            rrpBeaconServerAdminRoleDescription,
            hre.ethers.constants.AddressZero,
            airnodeRrp.address
          )
        ).to.be.revertedWith('Manager address zero');
      });
    });
  });

  describe('extendWhitelistExpiration', function () {
    context('Sender has whitelist expiration extender role', function () {
      context('Timestamp extends whitelist expiration', function () {
        it('extends whitelist expiration', async function () {
          let whitelistStatus;
          whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(
            beaconId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          const expirationTimestamp = 1000;
          await expect(
            rrpBeaconServer
              .connect(roles.whitelistExpirationExtender)
              .extendWhitelistExpiration(beaconId, roles.beaconReader.address, expirationTimestamp)
          )
            .to.emit(rrpBeaconServer, 'ExtendedWhitelistExpiration')
            .withArgs(
              beaconId,
              roles.beaconReader.address,
              roles.whitelistExpirationExtender.address,
              expirationTimestamp
            );
          whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(
            beaconId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(1000);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        });
      });
      context('Timestamp does not extend whitelist expiration', function () {
        it('reverts', async function () {
          await expect(
            rrpBeaconServer
              .connect(roles.whitelistExpirationExtender)
              .extendWhitelistExpiration(beaconId, roles.beaconReader.address, 0)
          ).to.be.revertedWith('Does not extend expiration');
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
          whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(
            beaconId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          const expirationTimestamp = 1000;
          await expect(
            rrpBeaconServer
              .connect(roles.manager)
              .extendWhitelistExpiration(beaconId, roles.beaconReader.address, expirationTimestamp)
          )
            .to.emit(rrpBeaconServer, 'ExtendedWhitelistExpiration')
            .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, expirationTimestamp);
          whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(
            beaconId,
            roles.beaconReader.address
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
            rrpBeaconServer.connect(roles.manager).extendWhitelistExpiration(beaconId, roles.beaconReader.address, 0)
          ).to.be.revertedWith('Does not extend expiration');
        });
      });
    });
    context('Sender does not have the whitelist extender role and is not the manager address', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer
            .connect(roles.whitelistExpirationSetter)
            .extendWhitelistExpiration(beaconId, roles.beaconReader.address, 1000)
        ).to.be.revertedWith('Cannot extend expiration');
        await expect(
          rrpBeaconServer
            .connect(roles.indefiniteWhitelister)
            .extendWhitelistExpiration(beaconId, roles.beaconReader.address, 1000)
        ).to.be.revertedWith('Cannot extend expiration');
        await expect(
          rrpBeaconServer
            .connect(roles.randomPerson)
            .extendWhitelistExpiration(beaconId, roles.beaconReader.address, 1000)
        ).to.be.revertedWith('Cannot extend expiration');
      });
    });
  });

  describe('setWhitelistExpiration', function () {
    context('Sender has whitelist expiration setter role', function () {
      it('sets whitelist expiration', async function () {
        let whitelistStatus;
        const expirationTimestamp = 1000;
        await expect(
          rrpBeaconServer
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(beaconId, roles.beaconReader.address, expirationTimestamp)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
          .withArgs(beaconId, roles.beaconReader.address, roles.whitelistExpirationSetter.address, expirationTimestamp);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        await expect(
          rrpBeaconServer
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(beaconId, roles.beaconReader.address, 0)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
          .withArgs(beaconId, roles.beaconReader.address, roles.whitelistExpirationSetter.address, 0);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      });
    });
    context('Sender is the manager address', function () {
      it('sets whitelist expiration', async function () {
        await accessControlRegistry
          .connect(roles.manager)
          .renounceRole(whitelistExpirationSetterRole, roles.manager.address);
        let whitelistStatus;
        const expirationTimestamp = 1000;
        await expect(
          rrpBeaconServer
            .connect(roles.manager)
            .setWhitelistExpiration(beaconId, roles.beaconReader.address, expirationTimestamp)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
          .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, expirationTimestamp);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        await expect(
          rrpBeaconServer.connect(roles.manager).setWhitelistExpiration(beaconId, roles.beaconReader.address, 0)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
          .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, 0);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      });
    });
    context('Sender does not have the whitelist expiration setter role and is not the manager address', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer
            .connect(roles.whitelistExpirationExtender)
            .setWhitelistExpiration(beaconId, roles.beaconReader.address, 0)
        ).to.be.revertedWith('Cannot set expiration');
        await expect(
          rrpBeaconServer
            .connect(roles.indefiniteWhitelister)
            .setWhitelistExpiration(beaconId, roles.beaconReader.address, 0)
        ).to.be.revertedWith('Cannot set expiration');
        await expect(
          rrpBeaconServer.connect(roles.randomPerson).setWhitelistExpiration(beaconId, roles.beaconReader.address, 0)
        ).to.be.revertedWith('Cannot set expiration');
      });
    });
  });

  describe('setIndefiniteWhitelistStatus', function () {
    context('Sender has indefinite whitelister role', function () {
      it('sets indefinite whitelist status', async function () {
        let whitelistStatus;
        // Whitelist indefinitely
        await expect(
          rrpBeaconServer
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
        )
          .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
          .withArgs(beaconId, roles.beaconReader.address, roles.indefiniteWhitelister.address, true, 1);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        expect(
          await rrpBeaconServer.beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
            beaconId,
            roles.beaconReader.address,
            roles.indefiniteWhitelister.address
          )
        ).to.equal(true);
        // Whitelisting indefinitely again should have no effect
        await expect(
          rrpBeaconServer
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
        )
          .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
          .withArgs(beaconId, roles.beaconReader.address, roles.indefiniteWhitelister.address, true, 1);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        expect(
          await rrpBeaconServer.beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
            beaconId,
            roles.beaconReader.address,
            roles.indefiniteWhitelister.address
          )
        ).to.equal(true);
        // Revoke indefinite whitelisting
        await expect(
          rrpBeaconServer
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, false)
        )
          .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
          .withArgs(beaconId, roles.beaconReader.address, roles.indefiniteWhitelister.address, false, 0);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
        expect(
          await rrpBeaconServer.beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
            beaconId,
            roles.beaconReader.address,
            roles.indefiniteWhitelister.address
          )
        ).to.equal(false);
        // Revoking indefinite whitelisting again should have no effect
        await expect(
          rrpBeaconServer
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, false)
        )
          .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
          .withArgs(beaconId, roles.beaconReader.address, roles.indefiniteWhitelister.address, false, 0);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
        expect(
          await rrpBeaconServer.beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
            beaconId,
            roles.beaconReader.address,
            roles.indefiniteWhitelister.address
          )
        ).to.equal(false);
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
          rrpBeaconServer
            .connect(roles.manager)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
        )
          .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
          .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, true, 1);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        expect(
          await rrpBeaconServer.beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
            beaconId,
            roles.beaconReader.address,
            roles.manager.address
          )
        ).to.equal(true);
        // Whitelisting indefinitely again should have no effect
        await expect(
          rrpBeaconServer
            .connect(roles.manager)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
        )
          .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
          .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, true, 1);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        expect(
          await rrpBeaconServer.beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
            beaconId,
            roles.beaconReader.address,
            roles.manager.address
          )
        ).to.equal(true);
        // Revoke indefinite whitelisting
        await expect(
          rrpBeaconServer
            .connect(roles.manager)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, false)
        )
          .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
          .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, false, 0);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
        expect(
          await rrpBeaconServer.beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
            beaconId,
            roles.beaconReader.address,
            roles.manager.address
          )
        ).to.equal(false);
        // Revoking indefinite whitelisting again should have no effect
        await expect(
          rrpBeaconServer
            .connect(roles.manager)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, false)
        )
          .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
          .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, false, 0);
        whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
        expect(
          await rrpBeaconServer.beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
            beaconId,
            roles.beaconReader.address,
            roles.manager.address
          )
        ).to.equal(false);
      });
    });
    context('Sender does not have the indefinite whitelister role and is not the manager address', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer
            .connect(roles.whitelistExpirationExtender)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
        ).to.be.revertedWith('Cannot set indefinite status');
        await expect(
          rrpBeaconServer
            .connect(roles.whitelistExpirationSetter)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
        ).to.be.revertedWith('Cannot set indefinite status');
        await expect(
          rrpBeaconServer
            .connect(roles.randomPerson)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
        ).to.be.revertedWith('Cannot set indefinite status');
      });
    });
  });

  describe('revokeIndefiniteWhitelistStatus', function () {
    context('setter does not have the indefinite whitelister role', function () {
      context('setter is not the manager address', function () {
        it('revokes indefinite whitelist status', async function () {
          // Grant indefinite whitelist status
          await rrpBeaconServer
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
          // Revoke the indefinite whitelister role
          await accessControlRegistry
            .connect(roles.manager)
            .revokeRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address);
          // Revoke the indefinite whitelist status
          await expect(
            rrpBeaconServer
              .connect(roles.randomPerson)
              .revokeIndefiniteWhitelistStatus(
                beaconId,
                roles.beaconReader.address,
                roles.indefiniteWhitelister.address
              )
          )
            .to.emit(rrpBeaconServer, 'RevokedIndefiniteWhitelistStatus')
            .withArgs(
              beaconId,
              roles.beaconReader.address,
              roles.indefiniteWhitelister.address,
              roles.randomPerson.address,
              0
            );
          const whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(
            beaconId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          // Revoking twice should not emit an event
          await expect(
            rrpBeaconServer
              .connect(roles.randomPerson)
              .revokeIndefiniteWhitelistStatus(
                beaconId,
                roles.beaconReader.address,
                roles.indefiniteWhitelister.address
              )
          ).to.not.emit(rrpBeaconServer, 'RevokedIndefiniteWhitelistStatus');
        });
      });
      context('setter is not the manager address', function () {
        it('reverts', async function () {
          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(indefiniteWhitelisterRole, roles.manager.address);
          await expect(
            rrpBeaconServer
              .connect(roles.randomPerson)
              .revokeIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, roles.manager.address)
          ).to.be.revertedWith('setter can set indefinite status');
        });
      });
    });
    context('setter has the indefinite whitelister role', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, roles.indefiniteWhitelister.address)
        ).to.be.revertedWith('setter can set indefinite status');
      });
    });
  });

  describe('setUpdatePermissionStatus', function () {
    context('Update requester not zero', function () {
      it('sets update permission status', async function () {
        expect(
          await rrpBeaconServer.sponsorToUpdateRequesterToPermissionStatus(
            roles.sponsor.address,
            roles.updateRequester.address
          )
        ).to.equal(false);
        await expect(
          rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true)
        )
          .to.emit(rrpBeaconServer, 'SetUpdatePermissionStatus')
          .withArgs(roles.sponsor.address, roles.updateRequester.address, true);
        expect(
          await rrpBeaconServer.sponsorToUpdateRequesterToPermissionStatus(
            roles.sponsor.address,
            roles.updateRequester.address
          )
        ).to.equal(true);
        await expect(
          rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, false)
        )
          .to.emit(rrpBeaconServer, 'SetUpdatePermissionStatus')
          .withArgs(roles.sponsor.address, roles.updateRequester.address, false);
        expect(
          await rrpBeaconServer.sponsorToUpdateRequesterToPermissionStatus(
            roles.sponsor.address,
            roles.updateRequester.address
          )
        ).to.equal(false);
      });
    });
    context('Update requester zero', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(hre.ethers.constants.AddressZero, false)
        ).to.be.revertedWith('Update requester zero');
      });
    });
  });

  describe('requestBeaconUpdate', function () {
    context('Request updater permitted', function () {
      context('RRP beacon server sponsored', function () {
        it('requests beacon update', async function () {
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
          await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
          // Compute the expected request ID
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpBeaconServer.address,
                await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                beaconParameters,
              ]
            )
          );
          // Request the beacon update
          await expect(
            rrpBeaconServer
              .connect(roles.updateRequester)
              .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters)
          )
            .to.emit(rrpBeaconServer, 'RequestedBeaconUpdate')
            .withArgs(
              beaconId,
              roles.sponsor.address,
              roles.updateRequester.address,
              requestId,
              templateId,
              sponsorWalletAddress,
              beaconParameters
            );
        });
      });
      context('RRP beacon server not sponsored', function () {
        it('reverts', async function () {
          await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
          // Attempt to request beacon update
          await expect(
            rrpBeaconServer
              .connect(roles.updateRequester)
              .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters)
          ).to.be.revertedWith('Requester not sponsored');
        });
      });
    });
    context('Request updater not permitted', function () {
      it('reverts', async function () {
        // Attempt to request beacon update
        await expect(
          rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters)
        ).to.be.revertedWith('Caller not permitted');
      });
    });
  });

  describe('readBeacon', function () {
    context('Caller whitelisted', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Whitelist the beacon reader
        await rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              beaconParameters,
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
        // Fulfill with 0 status code
        const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
        const encodedData = 123;
        const encodedTimestamp = now;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256', 'uint256'], [encodedData, encodedTimestamp]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId);
        expect(currentBeacon.value).to.be.equal(encodedData);
        expect(currentBeacon.timestamp).to.be.equal(encodedTimestamp);
      });
    });
    context('Caller address zero', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(voidSignerAddressZero).readBeacon(beaconId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              beaconParameters,
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
        // Fulfill with 0 status code
        const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
        const encodedData = 123;
        const encodedTimestamp = now;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256', 'uint256'], [encodedData, encodedTimestamp]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(voidSignerAddressZero).readBeacon(beaconId);
        expect(currentBeacon.value).to.be.equal(encodedData);
        expect(currentBeacon.timestamp).to.be.equal(encodedTimestamp);
      });
    });
    context('Caller not whitelisted', function () {
      it('reverts', async function () {
        await expect(rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId)).to.be.revertedWith(
          'Caller not whitelisted'
        );
      });
    });
  });

  describe('readerCanReadBeacon', function () {
    context('User whitelisted', function () {
      it('returns true', async function () {
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
        const expirationTimestamp = (await utils.getCurrentTimestamp(hre.ethers.provider)) + 1000;
        await rrpBeaconServer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(beaconId, roles.beaconReader.address, expirationTimestamp);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        await rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        await rrpBeaconServer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(beaconId, roles.beaconReader.address, 0);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        await rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, false);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
      });
    });
    context('User zero address', function () {
      it('returns true', async function () {
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, hre.ethers.constants.AddressZero)).to.equal(true);
      });
    });
    context('User not whitelisted', function () {
      it('returns false', async function () {
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.randomPerson.address)).to.equal(false);
      });
    });
  });

  // Tests for `fulfill()` should come last because the line below causes all following `fulfill()`
  // calls to revert
  // await hre.ethers.provider.send('evm_setNextBlockTimestamp', [2 ** 32]);
  // This can be solved by adding a `hardhat_reset` call to beforeEach, but that breaks solcover.
  describe('fulfill', function () {
    context('Caller Airnode RRP', function () {
      context('requestId has been registered', function () {
        context('Data typecast successfully', function () {
          context('Data fresher than beacon', function () {
            context('Data not older than 1 hour and not more than 1 hour from the future', function () {
              it('updates beacon', async function () {
                await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
                await rrpBeaconServer
                  .connect(roles.sponsor)
                  .setUpdatePermissionStatus(roles.updateRequester.address, true);
                // Compute the expected request ID
                const requestId = hre.ethers.utils.keccak256(
                  hre.ethers.utils.solidityPack(
                    [
                      'uint256',
                      'address',
                      'address',
                      'uint256',
                      'bytes32',
                      'address',
                      'address',
                      'address',
                      'bytes4',
                      'bytes',
                    ],
                    [
                      (await hre.ethers.provider.getNetwork()).chainId,
                      airnodeRrp.address,
                      rrpBeaconServer.address,
                      await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                      templateId,
                      roles.sponsor.address,
                      sponsorWalletAddress,
                      rrpBeaconServer.address,
                      rrpBeaconServer.interface.getSighash('fulfill'),
                      beaconParameters,
                    ]
                  )
                );
                // Request the beacon update
                await rrpBeaconServer
                  .connect(roles.updateRequester)
                  .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
                const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
                await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
                const encodedData = 123;
                const encodedTimestamp = now;
                const data = hre.ethers.utils.defaultAbiCoder.encode(
                  ['int256', 'uint256'],
                  [encodedData, encodedTimestamp]
                );
                const signature = await airnodeWallet.signMessage(
                  hre.ethers.utils.arrayify(
                    hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
                  )
                );
                await expect(
                  airnodeRrp
                    .connect(sponsorWallet)
                    .fulfill(
                      requestId,
                      airnodeAddress,
                      rrpBeaconServer.address,
                      rrpBeaconServer.interface.getSighash('fulfill'),
                      data,
                      signature,
                      { gasLimit: 500000 }
                    )
                )
                  .to.emit(rrpBeaconServer, 'UpdatedBeacon')
                  .withArgs(beaconId, requestId, encodedData, encodedTimestamp);
              });
            });
            context('Data older than 1 hour', function () {
              it('reverts', async function () {
                await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
                await rrpBeaconServer
                  .connect(roles.sponsor)
                  .setUpdatePermissionStatus(roles.updateRequester.address, true);
                // Compute the expected request ID
                const requestId = hre.ethers.utils.keccak256(
                  hre.ethers.utils.solidityPack(
                    [
                      'uint256',
                      'address',
                      'address',
                      'uint256',
                      'bytes32',
                      'address',
                      'address',
                      'address',
                      'bytes4',
                      'bytes',
                    ],
                    [
                      (await hre.ethers.provider.getNetwork()).chainId,
                      airnodeRrp.address,
                      rrpBeaconServer.address,
                      await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                      templateId,
                      roles.sponsor.address,
                      sponsorWalletAddress,
                      rrpBeaconServer.address,
                      rrpBeaconServer.interface.getSighash('fulfill'),
                      beaconParameters,
                    ]
                  )
                );
                // Request the beacon update
                await rrpBeaconServer
                  .connect(roles.updateRequester)
                  .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
                const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
                await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
                const encodedTimestamp = now - 4000;
                const encodedData = 123;
                const data = hre.ethers.utils.defaultAbiCoder.encode(
                  ['int256', 'uint256'],
                  [encodedData, encodedTimestamp]
                );
                const signature = await airnodeWallet.signMessage(
                  hre.ethers.utils.arrayify(
                    hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
                  )
                );
                const staticCallResult = await airnodeRrp
                  .connect(sponsorWallet)
                  .callStatic.fulfill(
                    requestId,
                    airnodeAddress,
                    rrpBeaconServer.address,
                    rrpBeaconServer.interface.getSighash('fulfill'),
                    data,
                    signature,
                    { gasLimit: 500000 }
                  );
                expect(staticCallResult.callSuccess).to.equal(false);
                expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Fulfillment stale');
                await expect(
                  airnodeRrp
                    .connect(sponsorWallet)
                    .fulfill(
                      requestId,
                      airnodeAddress,
                      rrpBeaconServer.address,
                      rrpBeaconServer.interface.getSighash('fulfill'),
                      data,
                      signature,
                      { gasLimit: 500000 }
                    )
                ).to.emit(airnodeRrp, 'FailedRequest');
              });
            });
            context('Data more than 1 hour from the future', function () {
              it('reverts', async function () {
                await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
                await rrpBeaconServer
                  .connect(roles.sponsor)
                  .setUpdatePermissionStatus(roles.updateRequester.address, true);
                // Compute the expected request ID
                const requestId = hre.ethers.utils.keccak256(
                  hre.ethers.utils.solidityPack(
                    [
                      'uint256',
                      'address',
                      'address',
                      'uint256',
                      'bytes32',
                      'address',
                      'address',
                      'address',
                      'bytes4',
                      'bytes',
                    ],
                    [
                      (await hre.ethers.provider.getNetwork()).chainId,
                      airnodeRrp.address,
                      rrpBeaconServer.address,
                      await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                      templateId,
                      roles.sponsor.address,
                      sponsorWalletAddress,
                      rrpBeaconServer.address,
                      rrpBeaconServer.interface.getSighash('fulfill'),
                      beaconParameters,
                    ]
                  )
                );
                // Request the beacon update
                await rrpBeaconServer
                  .connect(roles.updateRequester)
                  .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
                const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
                await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
                const encodedData = 123;
                const encodedTimestamp = now + 4000;
                const data = hre.ethers.utils.defaultAbiCoder.encode(
                  ['int256', 'uint256'],
                  [encodedData, encodedTimestamp]
                );
                const signature = await airnodeWallet.signMessage(
                  hre.ethers.utils.arrayify(
                    hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
                  )
                );
                const staticCallResult = await airnodeRrp
                  .connect(sponsorWallet)
                  .callStatic.fulfill(
                    requestId,
                    airnodeAddress,
                    rrpBeaconServer.address,
                    rrpBeaconServer.interface.getSighash('fulfill'),
                    data,
                    signature,
                    { gasLimit: 500000 }
                  );
                expect(staticCallResult.callSuccess).to.equal(false);
                expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Fulfillment from future');
                await expect(
                  airnodeRrp
                    .connect(sponsorWallet)
                    .fulfill(
                      requestId,
                      airnodeAddress,
                      rrpBeaconServer.address,
                      rrpBeaconServer.interface.getSighash('fulfill'),
                      data,
                      signature,
                      { gasLimit: 500000 }
                    )
                ).to.emit(airnodeRrp, 'FailedRequest');
              });
            });
          });
          context('Data not fresher than beacon', function () {
            it('reverts', async function () {
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
              await rrpBeaconServer
                .connect(roles.sponsor)
                .setUpdatePermissionStatus(roles.updateRequester.address, true);

              // Compute the expected first request ID
              const firstRequestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpBeaconServer.address,
                    await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                    templateId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpBeaconServer.address,
                    rrpBeaconServer.interface.getSighash('fulfill'),
                    beaconParameters,
                  ]
                )
              );
              // Request the first beacon update
              await rrpBeaconServer
                .connect(roles.updateRequester)
                .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
              // Prepare the first response
              const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
              let encodedData = 123;
              let encodedTimestamp = now;
              const firstData = hre.ethers.utils.defaultAbiCoder.encode(
                ['int256', 'uint256'],
                [encodedData, encodedTimestamp]
              );
              const firstSignature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [firstRequestId, firstData])
                  )
                )
              );

              // Compute the expected second request ID
              const secondRequestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpBeaconServer.address,
                    await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                    templateId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpBeaconServer.address,
                    rrpBeaconServer.interface.getSighash('fulfill'),
                    beaconParameters,
                  ]
                )
              );
              // Request the second beacon update
              await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
              await rrpBeaconServer
                .connect(roles.updateRequester)
                .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
              // Prepare the second response
              encodedData = 123;
              encodedTimestamp = now + 1;
              const secondData = hre.ethers.utils.defaultAbiCoder.encode(
                ['int256', 'uint256'],
                [encodedData, encodedTimestamp]
              );
              const secondSignature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [secondRequestId, secondData])
                  )
                )
              );
              // Fulfill the second beacon update
              await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 2]);
              await airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  secondRequestId,
                  airnodeAddress,
                  rrpBeaconServer.address,
                  rrpBeaconServer.interface.getSighash('fulfill'),
                  secondData,
                  secondSignature,
                  { gasLimit: 500000 }
                );
              // Attempt to fulfill the first beacon update
              await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 3]);
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  firstRequestId,
                  airnodeAddress,
                  rrpBeaconServer.address,
                  rrpBeaconServer.interface.getSighash('fulfill'),
                  firstData,
                  firstSignature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Fulfillment older than beacon');
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    firstRequestId,
                    airnodeAddress,
                    rrpBeaconServer.address,
                    rrpBeaconServer.interface.getSighash('fulfill'),
                    firstData,
                    firstSignature,
                    { gasLimit: 500000 }
                  )
              ).to.emit(airnodeRrp, 'FailedRequest');
            });
          });
        });
        context('Data does not typecast successfully', function () {
          context('Data larger than maximum int224', function () {
            it('reverts', async function () {
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
              await rrpBeaconServer
                .connect(roles.sponsor)
                .setUpdatePermissionStatus(roles.updateRequester.address, true);
              // Compute the expected request ID
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpBeaconServer.address,
                    await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                    templateId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpBeaconServer.address,
                    rrpBeaconServer.interface.getSighash('fulfill'),
                    beaconParameters,
                  ]
                )
              );
              // Request the beacon update
              await rrpBeaconServer
                .connect(roles.updateRequester)
                .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
              // Fulfill with non-typecastable data
              // Data should not be too large
              const encodedData = hre.ethers.BigNumber.from(2).pow(223);
              const encodedTimestamp = Math.floor(Date.now() / 1000);
              const data = hre.ethers.utils.defaultAbiCoder.encode(
                ['int256', 'uint256'],
                [encodedData, encodedTimestamp]
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
                )
              );
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpBeaconServer.address,
                  rrpBeaconServer.interface.getSighash('fulfill'),
                  data,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Value typecasting error');
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpBeaconServer.address,
                    rrpBeaconServer.interface.getSighash('fulfill'),
                    data,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.emit(airnodeRrp, 'FailedRequest');
            });
          });
          context('Data smaller than minimum int224', function () {
            it('reverts', async function () {
              await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
              await rrpBeaconServer
                .connect(roles.sponsor)
                .setUpdatePermissionStatus(roles.updateRequester.address, true);
              // Compute the expected request ID
              const requestId = hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  [
                    'uint256',
                    'address',
                    'address',
                    'uint256',
                    'bytes32',
                    'address',
                    'address',
                    'address',
                    'bytes4',
                    'bytes',
                  ],
                  [
                    (await hre.ethers.provider.getNetwork()).chainId,
                    airnodeRrp.address,
                    rrpBeaconServer.address,
                    await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                    templateId,
                    roles.sponsor.address,
                    sponsorWalletAddress,
                    rrpBeaconServer.address,
                    rrpBeaconServer.interface.getSighash('fulfill'),
                    beaconParameters,
                  ]
                )
              );
              // Request the beacon update
              await rrpBeaconServer
                .connect(roles.updateRequester)
                .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
              // Fulfill with non-typecastable data
              // Data should not be too small
              const encodedData = hre.ethers.BigNumber.from(2).pow(223).add(1).mul(-1);
              const encodedTimestamp = Math.floor(Date.now() / 1000);
              const data = hre.ethers.utils.defaultAbiCoder.encode(
                ['int256', 'uint256'],
                [encodedData, encodedTimestamp]
              );
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
                )
              );
              const staticCallResult = await airnodeRrp
                .connect(sponsorWallet)
                .callStatic.fulfill(
                  requestId,
                  airnodeAddress,
                  rrpBeaconServer.address,
                  rrpBeaconServer.interface.getSighash('fulfill'),
                  data,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Value typecasting error');
              await expect(
                airnodeRrp
                  .connect(sponsorWallet)
                  .fulfill(
                    requestId,
                    airnodeAddress,
                    rrpBeaconServer.address,
                    rrpBeaconServer.interface.getSighash('fulfill'),
                    data,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.emit(airnodeRrp, 'FailedRequest');
            });
          });
        });
        context('Timestamp does not typecast successfully', function () {
          it('reverts', async function () {
            await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
            await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
            // Compute the expected request ID
            const requestId = hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                [
                  'uint256',
                  'address',
                  'address',
                  'uint256',
                  'bytes32',
                  'address',
                  'address',
                  'address',
                  'bytes4',
                  'bytes',
                ],
                [
                  (await hre.ethers.provider.getNetwork()).chainId,
                  airnodeRrp.address,
                  rrpBeaconServer.address,
                  await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                  templateId,
                  roles.sponsor.address,
                  sponsorWalletAddress,
                  rrpBeaconServer.address,
                  rrpBeaconServer.interface.getSighash('fulfill'),
                  beaconParameters,
                ]
              )
            );
            // Request the beacon update
            await rrpBeaconServer
              .connect(roles.updateRequester)
              .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
            // Year should not be 2106+
            const encodedData = 123;
            const encodedTimestamp = 2 ** 32;
            const data = hre.ethers.utils.defaultAbiCoder.encode(
              ['int256', 'uint256'],
              [encodedData, encodedTimestamp]
            );
            const signature = await airnodeWallet.signMessage(
              hre.ethers.utils.arrayify(
                hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
              )
            );
            const staticCallResult = await airnodeRrp
              .connect(sponsorWallet)
              .callStatic.fulfill(
                requestId,
                airnodeAddress,
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                data,
                signature,
                { gasLimit: 500000 }
              );
            expect(staticCallResult.callSuccess).to.equal(false);
            expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Timestamp typecasting error');
            await expect(
              airnodeRrp
                .connect(sponsorWallet)
                .fulfill(
                  requestId,
                  airnodeAddress,
                  rrpBeaconServer.address,
                  rrpBeaconServer.interface.getSighash('fulfill'),
                  data,
                  signature,
                  { gasLimit: 500000 }
                )
            ).to.emit(airnodeRrp, 'FailedRequest');
          });
        });
      });
      context('Does not refer to an existing request', function () {
        it('reverts', async function () {
          // Endorse the requester
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.randomPerson.address, true);
          // Make the request
          const requestTimeParameters = utils.generateRandomBytes();
          await airnodeRrp
            .connect(roles.randomPerson)
            .makeTemplateRequest(
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              requestTimeParameters,
              { gasLimit: 500000 }
            );
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                roles.randomPerson.address,
                (await airnodeRrp.requesterToRequestCountPlusOne(roles.randomPerson.address)).sub(1),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                requestTimeParameters,
              ]
            )
          );
          // Fulfill the request
          const encodedData = 123;
          const encodedTimestamp = Math.floor(Date.now() / 1000);
          const data = hre.ethers.utils.defaultAbiCoder.encode(['int256', 'uint256'], [encodedData, encodedTimestamp]);
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
            )
          );
          const staticCallResult = await airnodeRrp
            .connect(sponsorWallet)
            .callStatic.fulfill(
              requestId,
              airnodeAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('No such request made');
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                data,
                signature,
                { gasLimit: 500000 }
              )
          ).to.emit(airnodeRrp, 'FailedRequest');
        });
      });
    });
    context('Caller not Airnode RRP', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer.connect(roles.randomPerson).fulfill(hre.ethers.constants.HashZero, '0x')
        ).to.be.revertedWith('Caller not Airnode RRP');
      });
    });
  });

  describe('readBeacon', function () {
    context('Caller whitelisted', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Whitelist the beacon reader
        await rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              beaconParameters,
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
        // Fulfill
        const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
        const encodedData = 123;
        const encodedTimestamp = now;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256', 'uint256'], [encodedData, encodedTimestamp]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId);
        expect(currentBeacon.value).to.be.equal(encodedData);
        expect(currentBeacon.timestamp).to.be.equal(encodedTimestamp);
      });
    });
    context('Caller not whitelisted', function () {
      it('reverts', async function () {
        await expect(rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId)).to.be.revertedWith(
          'Caller not whitelisted'
        );
      });
    });
  });

  describe('readerCanReadBeacon', function () {
    context('User whitelisted', function () {
      it('returns true', async function () {
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
        const expirationTimestamp = (await utils.getCurrentTimestamp(hre.ethers.provider)) + 1000;
        await rrpBeaconServer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(beaconId, roles.beaconReader.address, expirationTimestamp);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        await rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        await rrpBeaconServer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(beaconId, roles.beaconReader.address, 0);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
        await rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, false);
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
      });
    });
    context('User not whitelisted', function () {
      it('returns false', async function () {
        expect(await rrpBeaconServer.readerCanReadBeacon(beaconId, roles.randomPerson.address)).to.equal(false);
      });
    });
  });

  describe('deriveBeaconId', function () {
    it('derives beacon ID', async function () {
      expect(await rrpBeaconServer.deriveBeaconId(templateId, beaconParameters)).to.equal(beaconId);
      expect(await rrpBeaconServer.deriveBeaconId(templateId, '0x')).to.equal(
        hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, '0x']))
      );
      // templateId != beaconId if `parameters` is empty
      expect(await rrpBeaconServer.deriveBeaconId(templateId, '0x')).to.not.equal(templateId);
    });
  });
});
