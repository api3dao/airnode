/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let airnodeProtocol, airnodeRequester;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    sponsor: accounts[1],
    randomPerson: accounts[9],
  };
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  const airnodeRequesterFactory = await hre.ethers.getContractFactory('MockAirnodeRequester', roles.deployer);
  airnodeRequester = await airnodeRequesterFactory.deploy(airnodeProtocol.address);
});

describe('setRrpSponsorshipStatus', function () {
  context('Requester address not zero', function () {
    it('sets RRP sponsorship status', async function () {
      expect(
        await airnodeProtocol.sponsorToRequesterToRrpSponsorshipStatus(roles.sponsor.address, airnodeRequester.address)
      ).to.equal(false);
      await expect(airnodeProtocol.connect(roles.sponsor).setRrpSponsorshipStatus(airnodeRequester.address, true))
        .to.emit(airnodeProtocol, 'SetRrpSponsorshipStatus')
        .withArgs(roles.sponsor.address, airnodeRequester.address, true);
      expect(
        await airnodeProtocol.sponsorToRequesterToRrpSponsorshipStatus(roles.sponsor.address, airnodeRequester.address)
      ).to.equal(true);
      await expect(airnodeProtocol.connect(roles.sponsor).setRrpSponsorshipStatus(airnodeRequester.address, false))
        .to.emit(airnodeProtocol, 'SetRrpSponsorshipStatus')
        .withArgs(roles.sponsor.address, airnodeRequester.address, false);
      expect(
        await airnodeProtocol.sponsorToRequesterToRrpSponsorshipStatus(roles.sponsor.address, airnodeRequester.address)
      ).to.equal(false);
    });
  });
  context('Requester address zero', function () {
    it('reverts', async function () {
      await expect(
        airnodeProtocol.connect(roles.sponsor).setRrpSponsorshipStatus(hre.ethers.constants.AddressZero, true)
      ).to.be.revertedWith('Requester address zero');
    });
  });
});

describe('setPspSponsorshipStatus', function () {
  context('Subscription ID is not zero', function () {
    it('sets PSP sponsorship status', async function () {
      const subscriptionId = testUtils.generateRandomBytes32();
      expect(
        await airnodeProtocol.sponsorToSubscriptionIdToPspSponsorshipStatus(roles.sponsor.address, subscriptionId)
      ).to.equal(false);
      await expect(airnodeProtocol.connect(roles.sponsor).setPspSponsorshipStatus(subscriptionId, true))
        .to.emit(airnodeProtocol, 'SetPspSponsorshipStatus')
        .withArgs(roles.sponsor.address, subscriptionId, true);
      expect(
        await airnodeProtocol.sponsorToSubscriptionIdToPspSponsorshipStatus(roles.sponsor.address, subscriptionId)
      ).to.equal(true);
      await expect(airnodeProtocol.connect(roles.sponsor).setPspSponsorshipStatus(subscriptionId, false))
        .to.emit(airnodeProtocol, 'SetPspSponsorshipStatus')
        .withArgs(roles.sponsor.address, subscriptionId, false);
      expect(
        await airnodeProtocol.sponsorToSubscriptionIdToPspSponsorshipStatus(roles.sponsor.address, subscriptionId)
      ).to.equal(false);
    });
  });
  context('Subscription ID is zero', function () {
    it('reverts', async function () {
      await expect(
        airnodeProtocol.connect(roles.sponsor).setPspSponsorshipStatus(hre.ethers.constants.HashZero, true)
      ).to.be.revertedWith('Subscription ID zero');
    });
  });
});
