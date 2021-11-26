/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../utils');

let roles;
let accessControlRegistry, airnodeRrp, rrpBeaconServer;
let rrpBeaconServerAdminRoleDescription = 'RrpBeaconServer admin';
let adminRole, whitelistExpirationExtenderRole, whitelistExpirationSetterRole, indefiniteWhitelisterRole;
let airnodeAddress, airnodeMnemonic, airnodeXpub, airnodeWallet;
let sponsorWalletAddress, sponsorWallet;
let voidSignerAddressZero;
let endpointId, parameters, templateId;

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
  const airnodeRrpFactory = await hre.ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const rrpBeaconServerFactory = await hre.ethers.getContractFactory('RrpBeaconServer', roles.deployer);
  rrpBeaconServer = await rrpBeaconServerFactory.deploy(
    accessControlRegistry.address,
    rrpBeaconServerAdminRoleDescription,
    roles.manager.address,
    airnodeRrp.address
  );
  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  adminRole = await rrpBeaconServer.adminRole();
  whitelistExpirationExtenderRole = await rrpBeaconServer.whitelistExpirationExtenderRole();
  whitelistExpirationSetterRole = await rrpBeaconServer.whitelistExpirationSetterRole();
  indefiniteWhitelisterRole = await rrpBeaconServer.indefiniteWhitelisterRole();
  await accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
    [managerRootRole, adminRole, adminRole, adminRole, adminRole],
    [
      rrpBeaconServerAdminRoleDescription,
      await rrpBeaconServer.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
      await rrpBeaconServer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
      await rrpBeaconServer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
      await rrpBeaconServer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
    ],
    [
      roles.manager.address, // which will already have been granted the role
      roles.whitelistExpirationExtender.address,
      roles.whitelistExpirationSetter.address,
      roles.indefiniteWhitelister.address,
      roles.anotherIndefiniteWhitelister.address,
    ]
  );
  // Grant `roles.randomPerson` some invalid roles
  await accessControlRegistry
    .connect(roles.manager)
    .initializeAndGrantRoles(
      [managerRootRole, managerRootRole, managerRootRole, managerRootRole],
      [
        Math.random(),
        await rrpBeaconServer.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
        await rrpBeaconServer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
        await rrpBeaconServer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
      ],
      [roles.randomPerson.address, roles.randomPerson.address, roles.randomPerson.address, roles.randomPerson.address]
    );
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
  parameters = utils.generateRandomBytes();
  await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
  );
});

describe('constructor', function () {
  context('Manager address is not zero', function () {
    it('constructs', async function () {
      const rrpBeaconServerFactory = await hre.ethers.getContractFactory('RrpBeaconServer', roles.deployer);
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
      const rrpBeaconServerFactory = await hre.ethers.getContractFactory('RrpBeaconServer', roles.deployer);
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
        whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        const expirationTimestamp = 1000;
        await expect(
          rrpBeaconServer
            .connect(roles.whitelistExpirationExtender)
            .extendWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp)
        )
          .to.emit(rrpBeaconServer, 'ExtendedWhitelistExpiration')
          .withArgs(
            templateId,
            roles.beaconReader.address,
            roles.whitelistExpirationExtender.address,
            expirationTimestamp
          );
        whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
          templateId,
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
            .extendWhitelistExpiration(templateId, roles.beaconReader.address, 0)
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
        whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        const expirationTimestamp = 1000;
        await expect(
          rrpBeaconServer
            .connect(roles.manager)
            .extendWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp)
        )
          .to.emit(rrpBeaconServer, 'ExtendedWhitelistExpiration')
          .withArgs(templateId, roles.beaconReader.address, roles.manager.address, expirationTimestamp);
        whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
          templateId,
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
          rrpBeaconServer.connect(roles.manager).extendWhitelistExpiration(templateId, roles.beaconReader.address, 0)
        ).to.be.revertedWith('Does not extend expiration');
      });
    });
  });
  context('Sender does not have the whitelist extender role and is not the manager address', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer
          .connect(roles.whitelistExpirationSetter)
          .extendWhitelistExpiration(templateId, roles.beaconReader.address, 1000)
      ).to.be.revertedWith('Not expiration extender');
      await expect(
        rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .extendWhitelistExpiration(templateId, roles.beaconReader.address, 1000)
      ).to.be.revertedWith('Not expiration extender');
      await expect(
        rrpBeaconServer
          .connect(roles.randomPerson)
          .extendWhitelistExpiration(templateId, roles.beaconReader.address, 1000)
      ).to.be.revertedWith('Not expiration extender');
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
          .setWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp)
      )
        .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
        .withArgs(templateId, roles.beaconReader.address, roles.whitelistExpirationSetter.address, expirationTimestamp);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(
        rrpBeaconServer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(templateId, roles.beaconReader.address, 0)
      )
        .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
        .withArgs(templateId, roles.beaconReader.address, roles.whitelistExpirationSetter.address, 0);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
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
          .setWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp)
      )
        .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
        .withArgs(templateId, roles.beaconReader.address, roles.manager.address, expirationTimestamp);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(
        rrpBeaconServer.connect(roles.manager).setWhitelistExpiration(templateId, roles.beaconReader.address, 0)
      )
        .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
        .withArgs(templateId, roles.beaconReader.address, roles.manager.address, 0);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
    });
  });
  context('Sender does not have the whitelist expiration setter role and is not the manager address', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer
          .connect(roles.whitelistExpirationExtender)
          .setWhitelistExpiration(templateId, roles.beaconReader.address, 0)
      ).to.be.revertedWith('Not expiration setter');
      await expect(
        rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setWhitelistExpiration(templateId, roles.beaconReader.address, 0)
      ).to.be.revertedWith('Not expiration setter');
      await expect(
        rrpBeaconServer.connect(roles.randomPerson).setWhitelistExpiration(templateId, roles.beaconReader.address, 0)
      ).to.be.revertedWith('Not expiration setter');
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
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true)
      )
        .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
        .withArgs(templateId, roles.beaconReader.address, roles.indefiniteWhitelister.address, true, 1);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
      expect(
        await rrpBeaconServer.templateIdToReaderToSetterToIndefiniteWhitelistStatus(
          templateId,
          roles.beaconReader.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(true);
      // Whitelisting indefinitely again should have no effect
      await expect(
        rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true)
      )
        .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
        .withArgs(templateId, roles.beaconReader.address, roles.indefiniteWhitelister.address, true, 1);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
      expect(
        await rrpBeaconServer.templateIdToReaderToSetterToIndefiniteWhitelistStatus(
          templateId,
          roles.beaconReader.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(true);
      // Revoke indefinite whitelisting
      await expect(
        rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, false)
      )
        .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
        .withArgs(templateId, roles.beaconReader.address, roles.indefiniteWhitelister.address, false, 0);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(false);
      expect(
        await rrpBeaconServer.templateIdToReaderToSetterToIndefiniteWhitelistStatus(
          templateId,
          roles.beaconReader.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(false);
      // Revoking indefinite whitelisting again should have no effect
      await expect(
        rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, false)
      )
        .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
        .withArgs(templateId, roles.beaconReader.address, roles.indefiniteWhitelister.address, false, 0);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(false);
      expect(
        await rrpBeaconServer.templateIdToReaderToSetterToIndefiniteWhitelistStatus(
          templateId,
          roles.beaconReader.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(false);
    });
  });
  context('Sender is the manager address', function () {
    it('sets indefinite whitelist status', async function () {
      await accessControlRegistry.connect(roles.manager).renounceRole(indefiniteWhitelisterRole, roles.manager.address);
      let whitelistStatus;
      // Whitelist indefinitely
      await expect(
        rrpBeaconServer
          .connect(roles.manager)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true)
      )
        .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
        .withArgs(templateId, roles.beaconReader.address, roles.manager.address, true, 1);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
      expect(
        await rrpBeaconServer.templateIdToReaderToSetterToIndefiniteWhitelistStatus(
          templateId,
          roles.beaconReader.address,
          roles.manager.address
        )
      ).to.equal(true);
      // Whitelisting indefinitely again should have no effect
      await expect(
        rrpBeaconServer
          .connect(roles.manager)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true)
      )
        .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
        .withArgs(templateId, roles.beaconReader.address, roles.manager.address, true, 1);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
      expect(
        await rrpBeaconServer.templateIdToReaderToSetterToIndefiniteWhitelistStatus(
          templateId,
          roles.beaconReader.address,
          roles.manager.address
        )
      ).to.equal(true);
      // Revoke indefinite whitelisting
      await expect(
        rrpBeaconServer
          .connect(roles.manager)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, false)
      )
        .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
        .withArgs(templateId, roles.beaconReader.address, roles.manager.address, false, 0);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(false);
      expect(
        await rrpBeaconServer.templateIdToReaderToSetterToIndefiniteWhitelistStatus(
          templateId,
          roles.beaconReader.address,
          roles.manager.address
        )
      ).to.equal(false);
      // Revoking indefinite whitelisting again should have no effect
      await expect(
        rrpBeaconServer
          .connect(roles.manager)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, false)
      )
        .to.emit(rrpBeaconServer, 'SetIndefiniteWhitelistStatus')
        .withArgs(templateId, roles.beaconReader.address, roles.manager.address, false, 0);
      whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
        templateId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(false);
      expect(
        await rrpBeaconServer.templateIdToReaderToSetterToIndefiniteWhitelistStatus(
          templateId,
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
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true)
      ).to.be.revertedWith('Not indefinite whitelister');
      await expect(
        rrpBeaconServer
          .connect(roles.whitelistExpirationSetter)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true)
      ).to.be.revertedWith('Not indefinite whitelister');
      await expect(
        rrpBeaconServer
          .connect(roles.randomPerson)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true)
      ).to.be.revertedWith('Not indefinite whitelister');
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
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true);
        // Revoke the indefinite whitelister role
        await accessControlRegistry
          .connect(roles.manager)
          .revokeRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address);
        // Revoke the indefinite whitelist status
        await expect(
          rrpBeaconServer
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(
              templateId,
              roles.beaconReader.address,
              roles.indefiniteWhitelister.address
            )
        )
          .to.emit(rrpBeaconServer, 'RevokedIndefiniteWhitelistStatus')
          .withArgs(
            templateId,
            roles.beaconReader.address,
            roles.indefiniteWhitelister.address,
            roles.randomPerson.address,
            0
          );
        const whitelistStatus = await rrpBeaconServer.templateIdToReaderToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        // Revoking twice should not emit an event
        await expect(
          rrpBeaconServer
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(
              templateId,
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
            .revokeIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, roles.manager.address)
        ).to.be.revertedWith('setter is indefinite whitelister');
      });
    });
  });
  context('setter has the indefinite whitelister role', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer
          .connect(roles.randomPerson)
          .revokeIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, roles.indefiniteWhitelister.address)
      ).to.be.revertedWith('setter is indefinite whitelister');
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
              '0x',
            ]
          )
        );
        // Request the beacon update
        await expect(
          rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress)
        )
          .to.emit(rrpBeaconServer, 'RequestedBeaconUpdate')
          .withArgs(templateId, roles.sponsor.address, roles.updateRequester.address, requestId, sponsorWalletAddress);
      });
    });
    context('RRP beacon server not sponsored', function () {
      it('reverts', async function () {
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Attempt to request beacon update
        await expect(
          rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress)
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
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress)
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
        .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true);
      // Confirm that the beacon is empty
      const initialBeacon = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(templateId);
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
            '0x',
          ]
        )
      );
      // Request the beacon update
      await rrpBeaconServer
        .connect(roles.updateRequester)
        .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
      // Fulfill with 0 status code
      const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
        .timestamp;
      const nextBlockTimestamp = lastBlockTimestamp + 1;
      await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
      const decodedData = 123;
      const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
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
      const currentBeacon = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(templateId);
      expect(currentBeacon.value).to.be.equal(decodedData);
      expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
    });
  });
  context('Caller address zero', function () {
    it('reads beacon', async function () {
      await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
      await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
      // Confirm that the beacon is empty
      const initialBeacon = await rrpBeaconServer.connect(voidSignerAddressZero).readBeacon(templateId);
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
            '0x',
          ]
        )
      );
      // Request the beacon update
      await rrpBeaconServer
        .connect(roles.updateRequester)
        .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
      // Fulfill with 0 status code
      const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
        .timestamp;
      const nextBlockTimestamp = lastBlockTimestamp + 1;
      await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
      const decodedData = 123;
      const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
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
      const currentBeacon = await rrpBeaconServer.connect(voidSignerAddressZero).readBeacon(templateId);
      expect(currentBeacon.value).to.be.equal(decodedData);
      expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
    });
  });
  context('Caller not whitelisted', function () {
    it('reverts', async function () {
      await expect(rrpBeaconServer.connect(roles.beaconReader).readBeacon(templateId)).to.be.revertedWith(
        'Caller not whitelisted'
      );
    });
  });
});

describe('readerCanReadBeacon', function () {
  context('Template exists', function () {
    context('User whitelisted', function () {
      it('returns true', async function () {
        expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(false);
        const expirationTimestamp = (await utils.getCurrentTimestamp(hre.ethers.provider)) + 1000;
        await rrpBeaconServer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp);
        expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
        await rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, true);
        expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
        await rrpBeaconServer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(templateId, roles.beaconReader.address, 0);
        expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
        await rrpBeaconServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(templateId, roles.beaconReader.address, false);
        expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(false);
      });
    });
    context('User zero address', function () {
      it('returns true', async function () {
        expect(await rrpBeaconServer.readerCanReadBeacon(templateId, hre.ethers.constants.AddressZero)).to.equal(true);
      });
    });
    context('User not whitelisted', function () {
      it('returns false', async function () {
        expect(await rrpBeaconServer.readerCanReadBeacon(templateId, roles.randomPerson.address)).to.equal(false);
      });
    });
  });
  context('Template does not exist', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer.readerCanReadBeacon(utils.generateRandomBytes32(), roles.randomPerson.address)
      ).to.be.revertedWith('Template does not exist');
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
        it('updates beacon', async function () {
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
                '0x',
              ]
            )
          );
          // Request the beacon update
          await rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
          // Fulfill with 0 status code
          const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
            .timestamp;
          const nextBlockTimestamp = lastBlockTimestamp + 1;
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
          const decodedData = 123;
          const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
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
            .withArgs(templateId, requestId, decodedData, nextBlockTimestamp);
        });
      });
      context('Data does not typecast successfully', function () {
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
                '0x',
              ]
            )
          );
          // Request the beacon update
          await rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
          // Fulfill with non-typecastable data
          // Data should not be too large
          let staticCallResult;
          let data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [hre.ethers.BigNumber.from(2).pow(223)]);
          let signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
            )
          );
          staticCallResult = await airnodeRrp
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
          // Data should not be too small
          data = hre.ethers.utils.defaultAbiCoder.encode(
            ['int256'],
            [hre.ethers.BigNumber.from(2).pow(223).add(1).mul(-1)]
          );
          signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
            )
          );
          staticCallResult = await airnodeRrp
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
          // Year should not be 2038+
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [2 ** 32]);
          await hre.ethers.provider.send('evm_mine');
          data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [123]);
          signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
            )
          );
          staticCallResult = await airnodeRrp
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
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
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
        const data = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
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
        expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('No such request made');
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
