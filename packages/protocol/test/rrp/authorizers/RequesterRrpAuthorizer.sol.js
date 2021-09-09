/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../utils');

let roles;
let daoRequesterRrpAuthorizer;
let airnodeAddress = utils.generateRandomAddress();
let endpointId = utils.generateRandomBytes32();

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    user: accounts[2],
    randomPerson: accounts[9],
  };
  /// Using DaoRequesterRrpAuthorizer as a RequesterRrpAuthorizer substitute
  const daoRequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
    'DaoRequesterRrpAuthorizer',
    roles.deployer
  );
  daoRequesterRrpAuthorizer = await daoRequesterRrpAuthorizerFactory.deploy();
  await daoRequesterRrpAuthorizer.connect(roles.deployer).transferMetaAdminStatus(roles.metaAdmin.address);
});

describe('userIsWhitelisted', function () {
  context('User whitelisted', function () {
    it('returns false', async function () {
      expect(
        await daoRequesterRrpAuthorizer.userIsWhitelisted(airnodeAddress, endpointId, roles.user.address)
      ).to.equal(false);
      const expirationTimestamp = (await utils.getCurrentTimestamp(hre.ethers.provider)) + 1000;
      await daoRequesterRrpAuthorizer
        .connect(roles.metaAdmin)
        .setWhitelistExpiration(airnodeAddress, endpointId, roles.user.address, expirationTimestamp);
      expect(
        await daoRequesterRrpAuthorizer.userIsWhitelisted(airnodeAddress, endpointId, roles.user.address)
      ).to.equal(true);
      await daoRequesterRrpAuthorizer
        .connect(roles.metaAdmin)
        .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.user.address, true);
      expect(
        await daoRequesterRrpAuthorizer.userIsWhitelisted(airnodeAddress, endpointId, roles.user.address)
      ).to.equal(true);
      await daoRequesterRrpAuthorizer
        .connect(roles.metaAdmin)
        .setWhitelistExpiration(airnodeAddress, endpointId, roles.user.address, 0);
      expect(
        await daoRequesterRrpAuthorizer.userIsWhitelisted(airnodeAddress, endpointId, roles.user.address)
      ).to.equal(true);
      await daoRequesterRrpAuthorizer
        .connect(roles.metaAdmin)
        .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.user.address, false);
      expect(
        await daoRequesterRrpAuthorizer.userIsWhitelisted(airnodeAddress, endpointId, roles.user.address)
      ).to.equal(false);
    });
  });
  context('User not whitelisted', function () {
    it('returns true', async function () {
      expect(
        await daoRequesterRrpAuthorizer.userIsWhitelisted(airnodeAddress, endpointId, roles.randomPerson.address)
      ).to.equal(false);
    });
  });
});

describe('airnodeToEndpointIdToUserToWhitelistStatus', function () {
  it('returns whitelist status of the user for the Airnode–endpoint pair', async function () {
    let whitelistStatus;
    whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
      airnodeAddress,
      endpointId,
      roles.user.address
    );
    expect(whitelistStatus.expirationTimestamp).to.equal(0);
    expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
    const expirationTimestamp = (await utils.getCurrentTimestamp(hre.ethers.provider)) + 1000;
    await daoRequesterRrpAuthorizer
      .connect(roles.metaAdmin)
      .setWhitelistExpiration(airnodeAddress, endpointId, roles.user.address, expirationTimestamp);
    whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
      airnodeAddress,
      endpointId,
      roles.user.address
    );
    expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
    expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
    await daoRequesterRrpAuthorizer
      .connect(roles.metaAdmin)
      .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.user.address, true);
    whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
      airnodeAddress,
      endpointId,
      roles.user.address
    );
    expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
    expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
    await daoRequesterRrpAuthorizer
      .connect(roles.metaAdmin)
      .setWhitelistExpiration(airnodeAddress, endpointId, roles.user.address, 0);
    whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
      airnodeAddress,
      endpointId,
      roles.user.address
    );
    expect(whitelistStatus.expirationTimestamp).to.equal(0);
    expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
    await daoRequesterRrpAuthorizer
      .connect(roles.metaAdmin)
      .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.user.address, false);
    whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
      airnodeAddress,
      endpointId,
      roles.user.address
    );
    expect(whitelistStatus.expirationTimestamp).to.equal(0);
    expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
  });
});
