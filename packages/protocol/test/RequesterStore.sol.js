/* globals context ethers */

const { expect } = require('chai');

let airnodeRrp;
let roles;
const requesterIndex1 = 1,
  requesterIndex2 = 2;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    requesterAdmin1: accounts[1],
    requesterAdmin2: accounts[2],
    updatedRequesterAdmin1: accounts[3],
    client: accounts[4],
    randomPerson: accounts[9],
  };
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
});

describe('createRequester', function () {
  it('creates the requesters with incrementing indices and initializes their withdrawal request nonces', async function () {
    // Create two requesters
    await expect(airnodeRrp.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address))
      .to.emit(airnodeRrp, 'RequesterCreated')
      .withArgs(requesterIndex1, roles.requesterAdmin1.address);
    await expect(airnodeRrp.connect(roles.requesterAdmin2).createRequester(roles.requesterAdmin2.address))
      .to.emit(airnodeRrp, 'RequesterCreated')
      .withArgs(requesterIndex2, roles.requesterAdmin2.address);
    // Verify that the admin addresses are set correctly
    expect(await airnodeRrp.requesterIndexToAdmin(requesterIndex1)).to.equal(roles.requesterAdmin1.address);
    expect(await airnodeRrp.requesterIndexToAdmin(requesterIndex2)).to.equal(roles.requesterAdmin2.address);
    // Verify that the requester withdrawal nonces are initialized
    expect(await airnodeRrp.requesterIndexToNextWithdrawalRequestIndex(requesterIndex1)).to.equal(1);
    expect(await airnodeRrp.requesterIndexToNextWithdrawalRequestIndex(requesterIndex2)).to.equal(1);
  });
});

describe('setRequesterAdmin', function () {
  context('Caller is requester admin', async function () {
    it('sets the requester admin', async function () {
      // Create the requester
      await airnodeRrp.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address);
      // Update the requester admin
      await expect(
        airnodeRrp
          .connect(roles.requesterAdmin1)
          .setRequesterAdmin(requesterIndex1, roles.updatedRequesterAdmin1.address)
      )
        .to.emit(airnodeRrp, 'RequesterUpdated')
        .withArgs(requesterIndex1, roles.updatedRequesterAdmin1.address);
      // Verify that the requester admin is updated
      expect(await airnodeRrp.requesterIndexToAdmin(requesterIndex1)).to.equal(roles.updatedRequesterAdmin1.address);
    });
  });
  context('Caller not requester admin', async function () {
    it('reverts', async function () {
      // Create the requester
      await airnodeRrp.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address);
      // Attempt to update the requester admin
      await expect(
        airnodeRrp.connect(roles.randomPerson).setRequesterAdmin(requesterIndex1, roles.updatedRequesterAdmin1.address)
      ).to.be.revertedWith('Caller not requester admin');
    });
  });
});

describe('setClientEndorsementStatus', function () {
  context('Caller is requester admin', async function () {
    it('sets the client endorsement status and initializes the client request nonce', async function () {
      // Create the requester
      await airnodeRrp.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address);
      // Verify that the client is initially not endorsed
      expect(
        await airnodeRrp.requesterIndexToClientAddressToEndorsementStatus(requesterIndex1, roles.client.address)
      ).to.equal(false);
      // Verify that the client request nonce is not initialized
      expect(await airnodeRrp.clientAddressToNoRequests(roles.client.address)).to.equal(0);
      // Endorse the client
      await expect(
        airnodeRrp
          .connect(roles.requesterAdmin1)
          .setClientEndorsementStatus(requesterIndex1, roles.client.address, true)
      )
        .to.emit(airnodeRrp, 'ClientEndorsementStatusSet')
        .withArgs(requesterIndex1, roles.client.address, true);
      // Verify that the client is endorsed
      expect(
        await airnodeRrp.requesterIndexToClientAddressToEndorsementStatus(requesterIndex1, roles.client.address)
      ).to.equal(true);
      // Verify that the client request nonce is initialized
      expect(await airnodeRrp.clientAddressToNoRequests(roles.client.address)).to.equal(1);
      // Disendorse the client
      await expect(
        airnodeRrp
          .connect(roles.requesterAdmin1)
          .setClientEndorsementStatus(requesterIndex1, roles.client.address, false)
      )
        .to.emit(airnodeRrp, 'ClientEndorsementStatusSet')
        .withArgs(requesterIndex1, roles.client.address, false);
      // Verify that the client is disendorsed
      expect(
        await airnodeRrp.requesterIndexToClientAddressToEndorsementStatus(requesterIndex1, roles.client.address)
      ).to.equal(false);
    });
  });
  context('Caller not requester admin', async function () {
    it('reverts', async function () {
      // Create the requester
      await airnodeRrp.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address);
      // Attempt to endorse the client
      await expect(
        airnodeRrp.connect(roles.randomPerson).setClientEndorsementStatus(requesterIndex1, roles.client.address, true)
      ).to.be.revertedWith('Caller not requester admin');
    });
  });
});
