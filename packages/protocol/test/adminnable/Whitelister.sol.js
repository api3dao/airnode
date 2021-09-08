/* globals context */
/* eslint-disable no-unexpected-multiline */

const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

const AdminRank = Object.freeze({
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
  MetaAdmin: hre.ethers.BigNumber.from(2).pow(256).sub(1),
});

let roles;
let api3RequesterRrpAuthorizer;
let adminnedId, anotherId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    admin: accounts[2],
    superAdmin: accounts[3],
    user: accounts[4],
    randomPerson: accounts[9],
  };
  // We need to use Api3RequesterRrpAuthorizer to be able to seed the admin ranks
  const api3RequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
    'Api3RequesterRrpAuthorizer',
    roles.deployer
  );
  api3RequesterRrpAuthorizer = await api3RequesterRrpAuthorizerFactory.deploy(roles.metaAdmin.address);
  adminnedId = hre.ethers.constants.HashZero;
  anotherId = utils.generateRandomBytes32();
  await api3RequesterRrpAuthorizer.connect(roles.metaAdmin).setRank(adminnedId, roles.admin.address, AdminRank.Admin);
  await api3RequesterRrpAuthorizer
    .connect(roles.metaAdmin)
    .setRank(adminnedId, roles.superAdmin.address, AdminRank.SuperAdmin);
});

describe('extendWhitelistExpiration', function () {
  context('Caller of rank Admin or higher', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      it('extends whitelist expiration', async function () {
        const initialWhitelistStatus = await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(
          adminnedId,
          roles.user.address
        );
        expect(initialWhitelistStatus.expirationTimestamp).to.equal(0);
        expect(initialWhitelistStatus.whitelistedPastExpiration).to.equal(false);
        const extendedWhitelistExpirationTimestamp = 1000;
        await expect(
          api3RequesterRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(adminnedId, roles.user.address, extendedWhitelistExpirationTimestamp)
        )
          .to.emit(api3RequesterRrpAuthorizer, 'ExtendedWhitelistExpiration')
          .withArgs(adminnedId, roles.user.address, extendedWhitelistExpirationTimestamp, roles.admin.address);
        const extendedWhitelistStatus = await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(
          adminnedId,
          roles.user.address
        );
        expect(extendedWhitelistStatus.expirationTimestamp).to.equal(1000);
        expect(extendedWhitelistStatus.whitelistedPastExpiration).to.equal(false);
        const anotherWhitelistStatus = await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(
          anotherId,
          roles.user.address
        );
        expect(anotherWhitelistStatus.expirationTimestamp).to.equal(0);
        expect(anotherWhitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          api3RequesterRrpAuthorizer.connect(roles.admin).extendWhitelistExpiration(adminnedId, roles.user.address, 0)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller is of lower rank than Admin', function () {
    it('reverts', async function () {
      await expect(
        api3RequesterRrpAuthorizer
          .connect(roles.randomPerson)
          .extendWhitelistExpiration(adminnedId, roles.user.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('setWhitelistExpiration', function () {
  context('Caller of rank Super Admin or higher', function () {
    it('sets whitelist expiration', async function () {
      const extendedWhitelistExpirationTimestamp = 1000;
      await expect(
        api3RequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistExpiration(adminnedId, roles.user.address, extendedWhitelistExpirationTimestamp)
      )
        .to.emit(api3RequesterRrpAuthorizer, 'SetWhitelistExpiration')
        .withArgs(adminnedId, roles.user.address, extendedWhitelistExpirationTimestamp, roles.superAdmin.address);
      const extendedWhitelistStatus = await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(
        adminnedId,
        roles.user.address
      );
      expect(extendedWhitelistStatus.expirationTimestamp).to.equal(1000);
      expect(extendedWhitelistStatus.whitelistedPastExpiration).to.equal(false);
      const anotherWhitelistStatus = await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(
        anotherId,
        roles.user.address
      );
      expect(anotherWhitelistStatus.expirationTimestamp).to.equal(0);
      expect(anotherWhitelistStatus.whitelistedPastExpiration).to.equal(false);
      const reducedWhitelistExpirationTimestamp = 500;
      await expect(
        api3RequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistExpiration(adminnedId, roles.user.address, reducedWhitelistExpirationTimestamp)
      )
        .to.emit(api3RequesterRrpAuthorizer, 'SetWhitelistExpiration')
        .withArgs(adminnedId, roles.user.address, reducedWhitelistExpirationTimestamp, roles.superAdmin.address);
      const reducedWhitelistStatus = await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(
        adminnedId,
        roles.user.address
      );
      expect(reducedWhitelistStatus.expirationTimestamp).to.equal(reducedWhitelistExpirationTimestamp);
      expect(reducedWhitelistStatus.whitelistedPastExpiration).to.equal(false);
    });
  });
  context('Caller not of rank Super Admin or higher', function () {
    it('reverts', async function () {
      await expect(
        api3RequesterRrpAuthorizer.connect(roles.admin).setWhitelistExpiration(adminnedId, roles.user.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('setWhitelistStatusPastExpiration', function () {
  context('Caller of rank Super Admin or higher', function () {
    it('sets whitelist status past expiration', async function () {
      await expect(
        api3RequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistStatusPastExpiration(adminnedId, roles.user.address, true)
      )
        .to.emit(api3RequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
        .withArgs(adminnedId, roles.user.address, true, roles.superAdmin.address);
      const statusWhitelistedPastExpiration = await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(
        adminnedId,
        roles.user.address
      );
      expect(statusWhitelistedPastExpiration.expirationTimestamp).to.equal(0);
      expect(statusWhitelistedPastExpiration.whitelistedPastExpiration).to.equal(true);
      const anotherStatusWhitelistedPastExpiration = await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(
        anotherId,
        roles.user.address
      );
      expect(anotherStatusWhitelistedPastExpiration.expirationTimestamp).to.equal(0);
      expect(anotherStatusWhitelistedPastExpiration.whitelistedPastExpiration).to.equal(false);
      await expect(
        api3RequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistStatusPastExpiration(adminnedId, roles.user.address, false)
      )
        .to.emit(api3RequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
        .withArgs(adminnedId, roles.user.address, false, roles.superAdmin.address);
      const statusNotWhitelistedPastExpiration = await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(
        adminnedId,
        roles.user.address
      );
      expect(statusNotWhitelistedPastExpiration.expirationTimestamp).to.equal(0);
      expect(statusNotWhitelistedPastExpiration.whitelistedPastExpiration).to.equal(false);
    });
  });
  context('Caller not of rank Super Admin or higher', function () {
    it('reverts', async function () {
      await expect(
        api3RequesterRrpAuthorizer
          .connect(roles.admin)
          .setWhitelistStatusPastExpiration(adminnedId, roles.user.address, true)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('userIsWhitelisted', function () {
  context('User whitelisted past expiration', function () {
    context('Not past expiration', function () {
      it('returns true', async function () {
        await api3RequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistStatusPastExpiration(adminnedId, roles.user.address, true);
        const timestampOneHourLater = Math.floor(Date.now() / 1000) + 3600;
        await api3RequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistExpiration(adminnedId, roles.user.address, timestampOneHourLater);
        expect(await api3RequesterRrpAuthorizer.userIsWhitelisted(adminnedId, roles.user.address)).to.equal(true);
      });
    });
    context('Past expiration', function () {
      it('returns true', async function () {
        await api3RequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistStatusPastExpiration(adminnedId, roles.user.address, true);
        expect(await api3RequesterRrpAuthorizer.userIsWhitelisted(adminnedId, roles.user.address)).to.equal(true);
      });
    });
  });
  context('User not whitelisted past expiration', function () {
    context('Not past expiration', function () {
      it('returns true', async function () {
        const timestampOneHourLater = Math.floor(Date.now() / 1000) + 3600;
        await api3RequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistExpiration(adminnedId, roles.user.address, timestampOneHourLater);
        expect(await api3RequesterRrpAuthorizer.userIsWhitelisted(adminnedId, roles.user.address)).to.equal(true);
      });
    });
    context('Past expiration', function () {
      it('returns false', async function () {
        expect(await api3RequesterRrpAuthorizer.userIsWhitelisted(adminnedId, roles.user.address)).to.equal(false);
      });
    });
  });
});
