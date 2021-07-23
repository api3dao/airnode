/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('./utils');

let roles;
let airnodeRrp, authorizerAlwaysTrue, authorizerAlwaysFalse;
let airnodeAddress, airnodeMnemonic, airnodeXpub;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    sponsor: accounts[1],
    randomPerson: accounts[9],
  };
  const airnodeRrpFactory = await hre.ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const mockAuthorizerAlwaysTrueFactory = await hre.ethers.getContractFactory(
    'MockAuthorizerAlwaysTrue',
    roles.deployer
  );
  authorizerAlwaysTrue = await mockAuthorizerAlwaysTrueFactory.deploy();
  const mockAuthorizerAlwaysFalseFactory = await hre.ethers.getContractFactory(
    'MockAuthorizerAlwaysFalse',
    roles.deployer
  );
  authorizerAlwaysFalse = await mockAuthorizerAlwaysFalseFactory.deploy();
  ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = utils.generateRandomAirnodeWallet());
  await roles.deployer.sendTransaction({
    to: airnodeAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
});

describe('setAirnodeAnnouncement', function () {
  it('sets Airnode announcement', async function () {
    const initialAnnouncement = await airnodeRrp.getAirnodeAnnouncement(airnodeAddress);
    expect(initialAnnouncement.xpub).to.equal('');
    expect(initialAnnouncement.authorizers).to.deep.equal([]);
    const airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);
    const authorizers = Array.from({ length: 5 }, () => utils.generateRandomAddress());
    await expect(
      airnodeRrp.connect(airnodeWallet).setAirnodeAnnouncement(airnodeXpub, authorizers, { gasLimit: 500000 })
    )
      .to.emit(airnodeRrp, 'SetAirnodeAnnouncement')
      .withArgs(airnodeAddress, airnodeXpub, authorizers);
    const setAnnouncement = await airnodeRrp.getAirnodeAnnouncement(airnodeAddress);
    expect(setAnnouncement.xpub).to.equal(airnodeXpub);
    expect(setAnnouncement.authorizers).to.deep.equal(authorizers);
  });
});

describe('getAirnodeAnnouncement', function () {
  it('gets Airnode announcement', async function () {
    const airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);
    const authorizers = Array.from({ length: 5 }, () => utils.generateRandomAddress());
    await airnodeRrp.connect(airnodeWallet).setAirnodeAnnouncement(airnodeXpub, authorizers, { gasLimit: 500000 });
    const setAnnouncement = await airnodeRrp.getAirnodeAnnouncement(airnodeAddress);
    expect(setAnnouncement.xpub).to.equal(airnodeXpub);
    expect(setAnnouncement.authorizers).to.deep.equal(authorizers);
  });
});

describe('getTemplates', function () {
  it('gets templates', async function () {
    // Create the templates
    const noTemplates = 10;
    const airnodes = Array.from({ length: noTemplates }, () => utils.generateRandomAddress());
    const endpointIds = Array.from({ length: noTemplates }, () => utils.generateRandomBytes32());
    const parameters = Array.from({ length: noTemplates }, () => utils.generateRandomBytes32());
    const templateIds = [];
    for (let i = 0; i < noTemplates; i++) {
      await airnodeRrp.createTemplate(airnodes[i], endpointIds[i], parameters[i]);
      templateIds.push(
        hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodes[i], endpointIds[i], parameters[i]])
        )
      );
    }
    // Get the templates and verify them
    const templates = await airnodeRrp.getTemplates(templateIds);
    expect(templates.airnodes.length).to.equal(noTemplates);
    expect(templates.endpointIds.length).to.equal(noTemplates);
    expect(templates.parameters.length).to.equal(noTemplates);
    for (let i = 0; i < noTemplates; i++) {
      expect(templates.airnodes[i]).to.equal(airnodes[i]);
      expect(templates.endpointIds[i]).to.equal(endpointIds[i]);
      expect(templates.parameters[i]).to.equal(parameters[i]);
    }
  });
});

describe('checkAuthorizationStatus', function () {
  context('authorizers array is empty', function () {
    it('returns false', async function () {
      const requestId = utils.generateRandomBytes32();
      const endpointId = utils.generateRandomBytes32();
      const sponsor = utils.generateRandomAddress();
      const requester = utils.generateRandomAddress();
      expect(
        await airnodeRrp.checkAuthorizationStatus([], airnodeAddress, requestId, endpointId, sponsor, requester)
      ).to.equal(false);
    });
  });
  context('All authorizers return false', function () {
    it('returns false', async function () {
      const requestId = utils.generateRandomBytes32();
      const endpointId = utils.generateRandomBytes32();
      const sponsor = utils.generateRandomAddress();
      const requester = utils.generateRandomAddress();
      expect(
        await airnodeRrp.checkAuthorizationStatus(
          Array(5).fill(authorizerAlwaysFalse.address),
          airnodeAddress,
          requestId,
          endpointId,
          sponsor,
          requester
        )
      ).to.equal(false);
    });
  });
  context('At least one of the authorizers returns true', function () {
    it('returns true', async function () {
      const requestId = utils.generateRandomBytes32();
      const endpointId = utils.generateRandomBytes32();
      const sponsor = utils.generateRandomAddress();
      const requester = utils.generateRandomAddress();
      expect(
        await airnodeRrp.checkAuthorizationStatus(
          [...Array(5).fill(authorizerAlwaysFalse.address), authorizerAlwaysTrue.address],
          airnodeAddress,
          requestId,
          endpointId,
          sponsor,
          requester
        )
      ).to.equal(true);
    });
  });
});

describe('checkAuthorizationStatuses', function () {
  context('Parameter lengths equal', function () {
    it('checks authorization statuses', async function () {
      const noRequests = 10;
      const authorizers = Array(5).fill(authorizerAlwaysFalse.address);
      const requestIds = Array.from({ length: noRequests }, () => utils.generateRandomBytes32());
      const endpointIds = Array.from({ length: noRequests }, () => utils.generateRandomBytes32());
      const sponsors = Array.from({ length: noRequests }, () => utils.generateRandomAddress());
      const requesters = Array.from({ length: noRequests }, () => utils.generateRandomAddress());
      expect(
        await airnodeRrp.checkAuthorizationStatuses(
          authorizers,
          airnodeAddress,
          requestIds,
          endpointIds,
          sponsors,
          requesters
        )
      ).to.deep.equal(Array(noRequests).fill(false));
      expect(
        await airnodeRrp.checkAuthorizationStatuses(
          [...authorizers, authorizerAlwaysTrue.address],
          airnodeAddress,
          requestIds,
          endpointIds,
          sponsors,
          requesters
        )
      ).to.deep.equal(Array(noRequests).fill(true));
    });
  });
  context('Parameter lengths not equal', function () {
    it('reverts', async function () {
      const noRequests = 10;
      const authorizers = Array(5).fill(authorizerAlwaysFalse.address);
      const requestIds = Array.from({ length: noRequests }, () => utils.generateRandomBytes32());
      const endpointIds = Array.from({ length: noRequests }, () => utils.generateRandomBytes32());
      const sponsors = Array.from({ length: noRequests }, () => utils.generateRandomAddress());
      const requesters = Array.from({ length: noRequests }, () => utils.generateRandomAddress());
      await expect(
        airnodeRrp.checkAuthorizationStatuses(
          authorizers,
          airnodeAddress,
          [requestIds[0]],
          endpointIds,
          sponsors,
          requesters
        )
      ).to.be.revertedWith('Unequal parameter lengths');
      await expect(
        airnodeRrp.checkAuthorizationStatuses(
          authorizers,
          airnodeAddress,
          requestIds,
          [endpointIds[0]],
          sponsors,
          requesters
        )
      ).to.be.revertedWith('Unequal parameter lengths');
      await expect(
        airnodeRrp.checkAuthorizationStatuses(
          authorizers,
          airnodeAddress,
          requestIds,
          endpointIds,
          [sponsors[0]],
          requesters
        )
      ).to.be.revertedWith('Unequal parameter lengths');
      await expect(
        airnodeRrp.checkAuthorizationStatuses(authorizers, airnodeAddress, requestIds, endpointIds, sponsors, [
          requesters[0],
        ])
      ).to.be.revertedWith('Unequal parameter lengths');
    });
  });
});
