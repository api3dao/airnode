/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry, requesterAuthorizerWithManager;
let requesterAuthorizerWithManagerAdminRoleDescription = 'RequesterAuthorizerWithManager admin';
let adminRole, whitelistExpirationExtenderRole, whitelistExpirationSetterRole, indefiniteWhitelisterRole;
let airnodeAddress = testUtils.generateRandomAddress();
let endpointId = testUtils.generateRandomBytes32();

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
  adminRole = await requesterAuthorizerWithManager.adminRole();
  whitelistExpirationExtenderRole = await requesterAuthorizerWithManager.whitelistExpirationExtenderRole();
  whitelistExpirationSetterRole = await requesterAuthorizerWithManager.whitelistExpirationSetterRole();
  indefiniteWhitelisterRole = await requesterAuthorizerWithManager.indefiniteWhitelisterRole();
  await accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
    [managerRootRole, adminRole, adminRole, adminRole, adminRole],
    [
      requesterAuthorizerWithManagerAdminRoleDescription,
      await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
      await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
      await requesterAuthorizerWithManager.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
      await requesterAuthorizerWithManager.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
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
        await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
        await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
        await requesterAuthorizerWithManager.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
      ],
      [roles.randomPerson.address, roles.randomPerson.address, roles.randomPerson.address, roles.randomPerson.address]
    );
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
          expect(await requesterAuthorizerWithManager.accessControlRegistry()).to.equal(accessControlRegistry.address);
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
      ).to.be.revertedWith('Not expiration extender');
      await expect(
        requesterAuthorizerWithManager
          .connect(roles.indefiniteWhitelister)
          .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
      ).to.be.revertedWith('Not expiration extender');
      await expect(
        requesterAuthorizerWithManager
          .connect(roles.randomPerson)
          .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
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
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.whitelistExpirationSetter.address, 0);
      whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
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
      ).to.be.revertedWith('Not expiration setter');
      await expect(
        requesterAuthorizerWithManager
          .connect(roles.indefiniteWhitelister)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
      ).to.be.revertedWith('Not expiration setter');
      await expect(
        requesterAuthorizerWithManager
          .connect(roles.randomPerson)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
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
        requesterAuthorizerWithManager
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      )
        .to.emit(requesterAuthorizerWithManager, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, true, 1);
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
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, true, 1);
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
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, false, 0);
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
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, false, 0);
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
  context('Sender is the manager address', function () {
    it('sets indefinite whitelist status', async function () {
      await accessControlRegistry.connect(roles.manager).renounceRole(indefiniteWhitelisterRole, roles.manager.address);
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
      ).to.be.revertedWith('Not indefinite whitelister');
      await expect(
        requesterAuthorizerWithManager
          .connect(roles.whitelistExpirationSetter)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      ).to.be.revertedWith('Not indefinite whitelister');
      await expect(
        requesterAuthorizerWithManager
          .connect(roles.randomPerson)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      ).to.be.revertedWith('Not indefinite whitelister');
    });
  });
});

describe('revokeIndefiniteWhitelistStatus', function () {
  context('setter does not have the indefinite whitelister role', function () {
    context('setter is not the manager address', function () {
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
        const whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
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
    context('setter is the manager address', function () {
      it('reverts', async function () {
        await accessControlRegistry
          .connect(roles.manager)
          .renounceRole(indefiniteWhitelisterRole, roles.manager.address);
        await expect(
          requesterAuthorizerWithManager
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, roles.manager.address)
        ).to.be.revertedWith('setter is indefinite whitelister');
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
      ).to.be.revertedWith('setter is indefinite whitelister');
    });
  });
});

describe('requesterIsWhitelisted', function () {
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
          await requesterAuthorizerWithManager.requesterIsWhitelisted(
            airnodeAddress,
            endpointId,
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
          await requesterAuthorizerWithManager.requesterIsWhitelisted(
            airnodeAddress,
            endpointId,
            roles.requester.address
          )
        ).to.equal(true);
        // Also test the case with two indefinite whitelisters
        await requesterAuthorizerWithManager
          .connect(roles.anotherIndefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await requesterAuthorizerWithManager.requesterIsWhitelisted(
            airnodeAddress,
            endpointId,
            roles.requester.address
          )
        ).to.equal(true);
        await requesterAuthorizerWithManager
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false);
        expect(
          await requesterAuthorizerWithManager.requesterIsWhitelisted(
            airnodeAddress,
            endpointId,
            roles.requester.address
          )
        ).to.equal(true);
        await requesterAuthorizerWithManager
          .connect(roles.anotherIndefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false);
        expect(
          await requesterAuthorizerWithManager.requesterIsWhitelisted(
            airnodeAddress,
            endpointId,
            roles.requester.address
          )
        ).to.equal(false);
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
          await requesterAuthorizerWithManager.requesterIsWhitelisted(
            airnodeAddress,
            endpointId,
            roles.requester.address
          )
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns false', async function () {
        expect(
          await requesterAuthorizerWithManager.requesterIsWhitelisted(
            airnodeAddress,
            endpointId,
            roles.requester.address
          )
        ).to.equal(false);
      });
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
          await requesterAuthorizerWithManager.isAuthorized(
            testUtils.generateRandomBytes32(),
            airnodeAddress,
            endpointId,
            testUtils.generateRandomAddress(),
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
          await requesterAuthorizerWithManager.isAuthorized(
            testUtils.generateRandomBytes32(),
            airnodeAddress,
            endpointId,
            testUtils.generateRandomAddress(),
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
          await requesterAuthorizerWithManager.isAuthorized(
            testUtils.generateRandomBytes32(),
            airnodeAddress,
            endpointId,
            testUtils.generateRandomAddress(),
            roles.requester.address
          )
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns false', async function () {
        expect(
          await requesterAuthorizerWithManager.isAuthorized(
            testUtils.generateRandomBytes32(),
            airnodeAddress,
            endpointId,
            testUtils.generateRandomAddress(),
            roles.requester.address
          )
        ).to.equal(false);
      });
    });
  });
});
