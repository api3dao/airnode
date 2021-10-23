/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../utils');

let roles;
let accessControlRegistry, requesterAuthorizer;
let requesterAuthorizerAdminRoleDescription = 'RequesterAuthorizer admin';
let indefiniteWhitelisterRole;
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
  const requesterAuthorizerFactory = await hre.ethers.getContractFactory('RequesterAuthorizer', roles.deployer);
  requesterAuthorizer = await requesterAuthorizerFactory.deploy(
    accessControlRegistry.address,
    requesterAuthorizerAdminRoleDescription
  );
  ({ airnodeAddress: airnodeAddress, airnodeMnemonic: airnodeMnemonic } = utils.generateRandomAirnodeWallet());
  await roles.deployer.sendTransaction({
    to: airnodeAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);
  const airnodeRootRole = await accessControlRegistry.deriveRootRole(airnodeAddress);
  const requesterAuthorizerAdminRole = await accessControlRegistry.deriveRole(
    airnodeRootRole,
    requesterAuthorizerAdminRoleDescription
  );
  indefiniteWhitelisterRole = await accessControlRegistry.deriveRole(
    requesterAuthorizerAdminRole,
    await requesterAuthorizer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION()
  );
  await accessControlRegistry
    .connect(airnodeWallet)
    .initializeAndGrantRoles(
      [
        airnodeRootRole,
        requesterAuthorizerAdminRole,
        requesterAuthorizerAdminRole,
        requesterAuthorizerAdminRole,
        requesterAuthorizerAdminRole,
      ],
      [
        requesterAuthorizerAdminRoleDescription,
        await requesterAuthorizer.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
        await requesterAuthorizer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
        await requesterAuthorizer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
        await requesterAuthorizer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
      ],
      [
        hre.ethers.constants.AddressZero,
        roles.whitelistExpirationExtender.address,
        roles.whitelistExpirationSetter.address,
        roles.indefiniteWhitelister.address,
        roles.anotherIndefiniteWhitelister.address,
      ],
      { gasLimit: 1000000 }
    );
});

describe('constructor', function () {
  context('AccessControlRegistry address is not zero', function () {
    context('Admin role description string is not empty', function () {
      it('constructs', async function () {
        const requesterAuthorizerFactory = await hre.ethers.getContractFactory('RequesterAuthorizer', roles.deployer);
        requesterAuthorizer = await requesterAuthorizerFactory.deploy(
          accessControlRegistry.address,
          requesterAuthorizerAdminRoleDescription
        );
        expect(await requesterAuthorizer.accessControlRegistry()).to.equal(accessControlRegistry.address);
        expect(await requesterAuthorizer.adminRoleDescription()).to.equal(requesterAuthorizerAdminRoleDescription);
      });
    });
    context('Admin role description string is empty', function () {
      it('reverts', async function () {
        const requesterAuthorizerFactory = await hre.ethers.getContractFactory('RequesterAuthorizer', roles.deployer);
        await expect(requesterAuthorizerFactory.deploy(accessControlRegistry.address, '')).to.be.revertedWith(
          'Admin role description empty'
        );
      });
    });
  });
  context('AccessControlRegistry address is zero', function () {
    it('reverts', async function () {
      const requesterAuthorizerFactory = await hre.ethers.getContractFactory('RequesterAuthorizer', roles.deployer);
      await expect(
        requesterAuthorizerFactory.deploy(hre.ethers.constants.AddressZero, requesterAuthorizerAdminRoleDescription)
      ).to.be.revertedWith('ACR address zero');
    });
  });
});

describe('extendWhitelistExpiration', function () {
  context('Sender has whitelist expiration extender role', function () {
    context('Timestamp extends whitelist expiration', function () {
      it('extends whitelist expiration', async function () {
        let whitelistStatus;
        whitelistStatus = await requesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        const expirationTimestamp = 1000;
        await expect(
          requesterAuthorizer
            .connect(roles.whitelistExpirationExtender)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
        )
          .to.emit(requesterAuthorizer, 'ExtendedWhitelistExpiration')
          .withArgs(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.whitelistExpirationExtender.address,
            expirationTimestamp
          );
        whitelistStatus = await requesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
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
          requesterAuthorizer
            .connect(roles.whitelistExpirationExtender)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Does not extend expiration');
      });
    });
  });
  context('Sender does not have whitelist extender role', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizer
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
        requesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
      )
        .to.emit(requesterAuthorizer, 'SetWhitelistExpiration')
        .withArgs(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.whitelistExpirationSetter.address,
          expirationTimestamp
        );
      whitelistStatus = await requesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(
        requesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
      )
        .to.emit(requesterAuthorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.whitelistExpirationSetter.address, 0);
      whitelistStatus = await requesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
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
        requesterAuthorizer
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
        requesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      )
        .to.emit(requesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, true, 1);
      whitelistStatus = await requesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      // Whitelisting indefinitely again should have no effect
      await expect(
        requesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      )
        .to.emit(requesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, true, 1);
      whitelistStatus = await requesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      // Revoke indefinite whitelisting
      await expect(
        requesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
      )
        .to.emit(requesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, false, 0);
      whitelistStatus = await requesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      // Revoking indefinite whitelisting again should have no effect
      await expect(
        requesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
      )
        .to.emit(requesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, false, 0);
      whitelistStatus = await requesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
    });
  });
  context('Sender does not have indefinite whitelister role', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizer
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
      await requesterAuthorizer
        .connect(roles.indefiniteWhitelister)
        .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
      // Revoke the indefinite whitelister role
      await accessControlRegistry
        .connect(airnodeWallet)
        .revokeRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address, { gasLimit: 1000000 });
      // Revoke the indefinite whitelist status
      await expect(
        requesterAuthorizer
          .connect(roles.randomPerson)
          .revokeIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.indefiniteWhitelister.address
          )
      )
        .to.emit(requesterAuthorizer, 'RevokedIndefiniteWhitelistStatus')
        .withArgs(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address,
          roles.randomPerson.address,
          0
        );
      const whitelistStatus = await requesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      // Revoking twice should not emit an event
      await expect(
        requesterAuthorizer
          .connect(roles.randomPerson)
          .revokeIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.indefiniteWhitelister.address
          )
      ).to.not.emit(requesterAuthorizer, 'RevokedIndefiniteWhitelistStatus');
    });
  });
  context('setter has the indefinite whitelister role', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizer
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

describe('deriveRequesterAuthorizerRole', function () {
  it('derives roles under the Airnode root role', async function () {
    const description = Math.random();
    const airnodeRootRole = await accessControlRegistry.deriveRootRole(airnodeAddress);
    const requesterAuthorizerAdminRole = await accessControlRegistry.deriveRole(
      airnodeRootRole,
      requesterAuthorizerAdminRoleDescription
    );
    const role = await accessControlRegistry.deriveRole(requesterAuthorizerAdminRole, description);
    expect(await requesterAuthorizer.deriveRequesterAuthorizerRole(airnodeAddress, description)).to.equal(role);
  });
});

describe('requesterIsWhitelisted', function () {
  context('Requester is whitelisted indefinitely', function () {
    context('Requester is whitelisted temporarily', function () {
      it('returns true', async function () {
        await requesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        await requesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await requesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns true', async function () {
        await requesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await requesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
        // Also test the case with two indefinite whitelisters
        await requesterAuthorizer
          .connect(roles.anotherIndefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await requesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
        await requesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false);
        expect(
          await requesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
        await requesterAuthorizer
          .connect(roles.anotherIndefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false);
        expect(
          await requesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(false);
      });
    });
  });
  context('Requester is not whitelisted indefinitely', function () {
    context('Requester is whitelisted temporarily', function () {
      it('returns true', async function () {
        await requesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await requesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns false', async function () {
        expect(
          await requesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(false);
      });
    });
  });
});

describe('isAuthorized', function () {
  context('Requester is whitelisted indefinitely', function () {
    context('Requester is whitelisted temporarily', function () {
      it('returns true', async function () {
        await requesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        await requesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await requesterAuthorizer.isAuthorized(
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
        await requesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await requesterAuthorizer.isAuthorized(
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
        await requesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await requesterAuthorizer.isAuthorized(
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
          await requesterAuthorizer.isAuthorized(
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
