/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

let roles;
let api3RequesterRrpAuthorizer;
let airnodeAddress, airnodeId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    requester: accounts[2],
    randomPerson: accounts[9],
  };
  // We need to use Api3RequesterRrpAuthorizer to be able to seed the admin ranks
  const api3RequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
    'Api3RequesterRrpAuthorizer',
    roles.deployer
  );
  api3RequesterRrpAuthorizer = await api3RequesterRrpAuthorizerFactory.deploy(roles.metaAdmin.address);
  airnodeAddress = utils.generateRandomAddress();
  airnodeId = hre.ethers.utils.defaultAbiCoder.encode(['address'], [airnodeAddress]);
});

describe('isAuthorized', function () {
  context('requester whitelisted for Airnode', function () {
    it('returns true', async function () {
      await api3RequesterRrpAuthorizer
        .connect(roles.metaAdmin)
        .setWhitelistStatusPastExpiration(airnodeId, roles.requester.address, true);
      const requestId = utils.generateRandomBytes32();
      const endpointId = utils.generateRandomBytes32();
      const sponsor = utils.generateRandomAddress();
      expect(
        await api3RequesterRrpAuthorizer.isAuthorized(
          requestId,
          airnodeAddress,
          endpointId,
          sponsor,
          roles.requester.address
        )
      ).to.equal(true);
    });
  });
  context('requester not whitelisted for Airnode', function () {
    it('returns false', async function () {
      const requestId = utils.generateRandomBytes32();
      const endpointId = utils.generateRandomBytes32();
      const sponsor = utils.generateRandomAddress();
      expect(
        await api3RequesterRrpAuthorizer.isAuthorized(
          requestId,
          airnodeAddress,
          endpointId,
          sponsor,
          roles.requester.address
        )
      ).to.equal(false);
    });
  });
});
