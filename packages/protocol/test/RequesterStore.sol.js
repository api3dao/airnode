const { expect } = require('chai');

let airnode;
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
  const airnodeFactory = await ethers.getContractFactory('Airnode', roles.deployer);
  airnode = await airnodeFactory.deploy();
});

describe('createRequester', function () {
  it('creates the requesters with incrementing indices and initializes their withdrawal request nonces', async function () {
    // Create two requesters
    await expect(airnode.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address))
      .to.emit(airnode, 'RequesterCreated')
      .withArgs(requesterIndex1, roles.requesterAdmin1.address);
    await expect(airnode.connect(roles.requesterAdmin2).createRequester(roles.requesterAdmin2.address))
      .to.emit(airnode, 'RequesterCreated')
      .withArgs(requesterIndex2, roles.requesterAdmin2.address);
    // Verify that the admin addresses are set correctly
    expect(await airnode.requesterIndexToAdmin(requesterIndex1)).to.equal(roles.requesterAdmin1.address);
    expect(await airnode.requesterIndexToAdmin(requesterIndex2)).to.equal(roles.requesterAdmin2.address);
    // Verify that the requester withdrawal nonces are initialized
    expect(await airnode.requesterIndexToNoWithdrawalRequests(requesterIndex1)).to.equal(1);
    expect(await airnode.requesterIndexToNoWithdrawalRequests(requesterIndex2)).to.equal(1);
  });
});

describe('updateRequesterAdmin', function () {
  context('Caller is requester admin', async function () {
    it('updates the requester admin', async function () {
      // Create the requester
      await airnode.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address);
      // Update the requester admin
      await expect(
        airnode
          .connect(roles.requesterAdmin1)
          .updateRequesterAdmin(requesterIndex1, roles.updatedRequesterAdmin1.address)
      )
        .to.emit(airnode, 'RequesterUpdated')
        .withArgs(requesterIndex1, roles.updatedRequesterAdmin1.address);
      // Verify that the requester admin is updated
      expect(await airnode.requesterIndexToAdmin(requesterIndex1)).to.equal(roles.updatedRequesterAdmin1.address);
    });
  });
  context('Caller is not requester admin', async function () {
    it('reverts', async function () {
      // Create the requester
      await airnode.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address);
      // Attempt to update the requester admin
      await expect(
        airnode.connect(roles.randomPerson).updateRequesterAdmin(requesterIndex1, roles.updatedRequesterAdmin1.address)
      ).to.be.revertedWith('Caller is not requester admin');
    });
  });
});

describe('setClientEndorsementStatus', function () {
  context('Caller is requester admin', async function () {
    it('sets the client endorsement status and initializes the client request nonce', async function () {
      // Create the requester
      await airnode.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address);
      // Verify that the client is initially not endorsed
      expect(
        await airnode.requesterIndexToClientAddressToEndorsementStatus(requesterIndex1, roles.client.address)
      ).to.equal(false);
      // Verify that the client request nonce is not initialized
      expect(await airnode.clientAddressToNoRequests(roles.client.address)).to.equal(0);
      // Endorse the client
      await expect(
        airnode.connect(roles.requesterAdmin1).setClientEndorsementStatus(requesterIndex1, roles.client.address, true)
      )
        .to.emit(airnode, 'ClientEndorsementStatusSet')
        .withArgs(requesterIndex1, roles.client.address, true);
      // Verify that the client is endorsed
      expect(
        await airnode.requesterIndexToClientAddressToEndorsementStatus(requesterIndex1, roles.client.address)
      ).to.equal(true);
      // Verify that the client request nonce is initialized
      expect(await airnode.clientAddressToNoRequests(roles.client.address)).to.equal(1);
      // Disendorse the client
      await expect(
        airnode.connect(roles.requesterAdmin1).setClientEndorsementStatus(requesterIndex1, roles.client.address, false)
      )
        .to.emit(airnode, 'ClientEndorsementStatusSet')
        .withArgs(requesterIndex1, roles.client.address, false);
      // Verify that the client is disendorsed
      expect(
        await airnode.requesterIndexToClientAddressToEndorsementStatus(requesterIndex1, roles.client.address)
      ).to.equal(false);
    });
  });
  context('Caller is not requester admin', async function () {
    it('reverts', async function () {
      // Create the requester
      await airnode.connect(roles.requesterAdmin1).createRequester(roles.requesterAdmin1.address);
      // Attempt to endorse the client
      await expect(
        airnode.connect(roles.randomPerson).setClientEndorsementStatus(requesterIndex1, roles.client.address, true)
      ).to.be.revertedWith('Caller is not requester admin');
    });
  });
});
