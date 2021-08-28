/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

let roles;
let selfRequesterRrpAuthorizer;
let airnodeAddress, airnodeMnemonic, airnodeId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    requester: accounts[2],
    randomPerson: accounts[9],
  };
  // We need to use SelfRequesterRrpAuthorizer to be able to seed the admin ranks
  const selfRequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
    'SelfRequesterRrpAuthorizer',
    roles.deployer
  );
  selfRequesterRrpAuthorizer = await selfRequesterRrpAuthorizerFactory.deploy();
  ({ airnodeAddress: airnodeAddress, airnodeMnemonic: airnodeMnemonic } = utils.generateRandomAirnodeWallet());
  airnodeId = hre.ethers.utils.defaultAbiCoder.encode(['address'], [airnodeAddress]);
});

describe('isAuthorized', function () {
  context('requester whitelisted for Airnode', function () {
    it('returns true', async function () {
      await roles.deployer.sendTransaction({
        to: airnodeAddress,
        value: hre.ethers.utils.parseEther('1'),
      });
      const airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);
      await selfRequesterRrpAuthorizer
        .connect(airnodeWallet)
        .setWhitelistStatusPastExpiration(airnodeId, roles.requester.address, true);
      const requestId = utils.generateRandomBytes32();
      const endpointId = utils.generateRandomBytes32();
      const sponsor = utils.generateRandomAddress();
      expect(
        await selfRequesterRrpAuthorizer.isAuthorized(
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
        await selfRequesterRrpAuthorizer.isAuthorized(
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
