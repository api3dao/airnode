/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../utils');

let roles;
let accessControlRegistry, daoRequesterAuthorizer;
let daoRequesterAuthorizerAdminRoleDescription = 'DaoRequesterAuthorizer admin';
let indefiniteWhitelisterRole;
let airnodeAddress = utils.generateRandomAddress();
let endpointId = utils.generateRandomBytes32();

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    dao: accounts[1],
    whitelistExpirationExtender: accounts[2],
    whitelistExpirationSetter: accounts[3],
    indefiniteWhitelister: accounts[4],
    anotherIndefiniteWhitelister: accounts[5],
    requester: accounts[5],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const daoDaoRequesterAuthorizerFactory = await hre.ethers.getContractFactory(
    'DaoRequesterAuthorizer',
    roles.deployer
  );
  daoRequesterAuthorizer = await daoDaoRequesterAuthorizerFactory.deploy(
    accessControlRegistry.address,
    daoRequesterAuthorizerAdminRoleDescription,
    roles.dao.address
  );
  const daoRootRole = await accessControlRegistry.deriveRootRole(roles.dao.address);
  const daoRequesterAuthorizerAdminRole = await accessControlRegistry.deriveRole(
    daoRootRole,
    daoRequesterAuthorizerAdminRoleDescription
  );
  indefiniteWhitelisterRole = await accessControlRegistry.deriveRole(
    daoRequesterAuthorizerAdminRole,
    await daoRequesterAuthorizer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION()
  );
  await accessControlRegistry
    .connect(roles.dao)
    .initializeAndGrantRoles(
      [
        daoRootRole,
        daoRequesterAuthorizerAdminRole,
        daoRequesterAuthorizerAdminRole,
        daoRequesterAuthorizerAdminRole,
        daoRequesterAuthorizerAdminRole,
      ],
      [
        daoRequesterAuthorizerAdminRoleDescription,
        await daoRequesterAuthorizer.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
        await daoRequesterAuthorizer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
        await daoRequesterAuthorizer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
        await daoRequesterAuthorizer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
      ],
      [
        hre.ethers.constants.AddressZero,
        roles.whitelistExpirationExtender.address,
        roles.whitelistExpirationSetter.address,
        roles.indefiniteWhitelister.address,
        roles.anotherIndefiniteWhitelister.address,
      ]
    );
});

describe('constructor', function () {
  context('AccessControlRegistry address is not zero', function () {
    context('Admin role description string is not empty', function () {
      context('DAO address is not zero', function () {
        it('constructs', async function () {
          const daoDaoRequesterAuthorizerFactory = await hre.ethers.getContractFactory(
            'DaoRequesterAuthorizer',
            roles.deployer
          );
          daoRequesterAuthorizer = await daoDaoRequesterAuthorizerFactory.deploy(
            accessControlRegistry.address,
            daoRequesterAuthorizerAdminRoleDescription,
            roles.dao.address
          );
          expect(await daoRequesterAuthorizer.accessControlRegistry()).to.equal(accessControlRegistry.address);
          expect(await daoRequesterAuthorizer.adminRoleDescription()).to.equal(
            daoRequesterAuthorizerAdminRoleDescription
          );
          expect(await daoRequesterAuthorizer.dao()).to.equal(roles.dao.address);
        });
      });
      context('DAO address is zero', function () {
        it('reverts', async function () {
          const daoDaoRequesterAuthorizerFactory = await hre.ethers.getContractFactory(
            'DaoRequesterAuthorizer',
            roles.deployer
          );
          await expect(
            daoDaoRequesterAuthorizerFactory.deploy(
              accessControlRegistry.address,
              daoRequesterAuthorizerAdminRoleDescription,
              hre.ethers.constants.AddressZero
            )
          ).to.be.revertedWith('DAO address zero');
        });
      });
    });
    context('Admin role description string is empty', function () {
      it('reverts', async function () {
        const daoDaoRequesterAuthorizerFactory = await hre.ethers.getContractFactory(
          'DaoRequesterAuthorizer',
          roles.deployer
        );
        await expect(
          daoDaoRequesterAuthorizerFactory.deploy(accessControlRegistry.address, '', roles.dao.address)
        ).to.be.revertedWith('Admin role description empty');
      });
    });
  });
  context('AccessControlRegistry address is zero', function () {
    it('reverts', async function () {
      const daoDaoRequesterAuthorizerFactory = await hre.ethers.getContractFactory(
        'DaoRequesterAuthorizer',
        roles.deployer
      );
      await expect(
        daoDaoRequesterAuthorizerFactory.deploy(
          hre.ethers.constants.AddressZero,
          daoRequesterAuthorizerAdminRoleDescription,
          roles.dao.address
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
        whitelistStatus = await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        const expirationTimestamp = 1000;
        await expect(
          daoRequesterAuthorizer
            .connect(roles.whitelistExpirationExtender)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
        )
          .to.emit(daoRequesterAuthorizer, 'ExtendedWhitelistExpiration')
          .withArgs(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.whitelistExpirationExtender.address,
            expirationTimestamp
          );
        whitelistStatus = await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
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
          daoRequesterAuthorizer
            .connect(roles.whitelistExpirationExtender)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Does not extend expiration');
      });
    });
  });
  context('Sender does not have whitelist extender role', function () {
    it('reverts', async function () {
      await expect(
        daoRequesterAuthorizer
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
        daoRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
      )
        .to.emit(daoRequesterAuthorizer, 'SetWhitelistExpiration')
        .withArgs(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.whitelistExpirationSetter.address,
          expirationTimestamp
        );
      whitelistStatus = await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(
        daoRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
      )
        .to.emit(daoRequesterAuthorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.whitelistExpirationSetter.address, 0);
      whitelistStatus = await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
    });
  });
  context('Sender does not have whitelist expiration setter role', function () {
    it('reverts', async function () {
      await expect(
        daoRequesterAuthorizer
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
        daoRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      )
        .to.emit(daoRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, true, 1);
      whitelistStatus = await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(
        await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(true);
      // Whitelisting indefinitely again should have no effect
      await expect(
        daoRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      )
        .to.emit(daoRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, true, 1);
      whitelistStatus = await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(
        await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(true);
      // Revoke indefinite whitelisting
      await expect(
        daoRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
      )
        .to.emit(daoRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, false, 0);
      whitelistStatus = await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(
        await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(false);
      // Revoking indefinite whitelisting again should have no effect
      await expect(
        daoRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
      )
        .to.emit(daoRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, false, 0);
      whitelistStatus = await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(
        await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(false);
    });
  });
  context('Sender does not have indefinite whitelister role', function () {
    it('reverts', async function () {
      await expect(
        daoRequesterAuthorizer
          .connect(roles.randomPerson)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      ).to.be.revertedWith('Not indefinite whitelister');
    });
  });
});

describe('revokeIndefiniteWhitelistStatus', function () {
  context('setter does not have the indefinite whitelister role', function () {
    it('revokes indefinite whitelist status', async function () {
      // Grant indefinite whitelist status
      await daoRequesterAuthorizer
        .connect(roles.indefiniteWhitelister)
        .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
      // Revoke the indefinite whitelister role
      await accessControlRegistry
        .connect(roles.dao)
        .revokeRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address);
      // Revoke the indefinite whitelist status
      await expect(
        daoRequesterAuthorizer
          .connect(roles.randomPerson)
          .revokeIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.indefiniteWhitelister.address
          )
      )
        .to.emit(daoRequesterAuthorizer, 'RevokedIndefiniteWhitelistStatus')
        .withArgs(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address,
          roles.randomPerson.address,
          0
        );
      const whitelistStatus = await daoRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      // Revoking twice should not emit an event
      await expect(
        daoRequesterAuthorizer
          .connect(roles.randomPerson)
          .revokeIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.indefiniteWhitelister.address
          )
      ).to.not.emit(daoRequesterAuthorizer, 'RevokedIndefiniteWhitelistStatus');
    });
  });
  context('setter has the indefinite whitelister role', function () {
    it('reverts', async function () {
      await expect(
        daoRequesterAuthorizer
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
        await daoRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        await daoRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await daoRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns true', async function () {
        await daoRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await daoRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
        // Also test the case with two indefinite whitelisters
        await daoRequesterAuthorizer
          .connect(roles.anotherIndefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await daoRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
        await daoRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false);
        expect(
          await daoRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
        await daoRequesterAuthorizer
          .connect(roles.anotherIndefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false);
        expect(
          await daoRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(false);
      });
    });
  });
  context('Requester is not whitelisted indefinitely', function () {
    context('Requester is whitelisted temporarily', function () {
      it('returns true', async function () {
        await daoRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await daoRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns false', async function () {
        expect(
          await daoRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(false);
      });
    });
  });
});

describe('isAuthorized', function () {
  context('Requester is whitelisted indefinitely', function () {
    context('Requester is whitelisted temporarily', function () {
      it('returns true', async function () {
        await daoRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        await daoRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await daoRequesterAuthorizer.isAuthorized(
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
        await daoRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await daoRequesterAuthorizer.isAuthorized(
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
        await daoRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await daoRequesterAuthorizer.isAuthorized(
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
          await daoRequesterAuthorizer.isAuthorized(
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
