/* globals context ethers */

const { expect } = require('chai');

let airnodeRrp;
let roles;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    requesterAdmin: accounts[1],
    client: accounts[2],
    randomPerson: accounts[9],
  };
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
});

describe('setClientEndorsementStatus', function () {
  context('Caller is requester admin', async function () {
    it('sets the client endorsement status and initializes the client request nonce', async function () {
      // Verify that the client is initially not endorsed
      expect(
        await airnodeRrp.requesterToClientAddressToEndorsementStatus(roles.requesterAdmin.address, roles.client.address)
      ).to.equal(false);
      // Verify that the client request nonce is not initialized
      expect(await airnodeRrp.clientAddressToNoRequests(roles.client.address)).to.equal(0);
      // Endorse the client
      await expect(airnodeRrp.connect(roles.requesterAdmin).setClientEndorsementStatus(roles.client.address, true))
        .to.emit(airnodeRrp, 'ClientEndorsementStatusSet')
        .withArgs(roles.requesterAdmin.address, roles.client.address, true);
      // Verify that the client is endorsed
      expect(
        await airnodeRrp.requesterToClientAddressToEndorsementStatus(roles.requesterAdmin.address, roles.client.address)
      ).to.equal(true);
      // Verify that the client request nonce is initialized
      expect(await airnodeRrp.clientAddressToNoRequests(roles.client.address)).to.equal(1);
      // Disendorse the client
      await expect(airnodeRrp.connect(roles.requesterAdmin).setClientEndorsementStatus(roles.client.address, false))
        .to.emit(airnodeRrp, 'ClientEndorsementStatusSet')
        .withArgs(roles.requesterAdmin.address, roles.client.address, false);
      // Verify that the client is disendorsed
      expect(
        await airnodeRrp.requesterToClientAddressToEndorsementStatus(roles.requesterAdmin.address, roles.client.address)
      ).to.equal(false);
    });
  });
});
