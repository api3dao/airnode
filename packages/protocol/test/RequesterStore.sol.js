const { expect } = require('chai');
const { createRequester } = require('./helpers/requester');

let airnode;
let roles;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    requesterAdmin: accounts[1],
    updatedRequesterAdmin: accounts[2],
    client: accounts[3],
    randomPerson: accounts[9],
  };
  const airnodeFactory = await ethers.getContractFactory('Airnode', roles.deployer);
  airnode = await airnodeFactory.deploy();
});

describe('createRequester', function () {
  it('creates a requester record', async function () {
    const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
    const requesterAdmin = await airnode.requesterIndexToAdmin(requesterIndex);
    expect(requesterAdmin).to.equal(roles.requesterAdmin.address);
  });
  it('assigns requester indices incrementally', async function () {
    const requesterIndex1 = await createRequester(airnode, roles.requesterAdmin);
    expect(requesterIndex1).to.equal(ethers.BigNumber.from(1));
    const requesterIndex2 = await createRequester(airnode, roles.requesterAdmin);
    expect(requesterIndex2).to.equal(ethers.BigNumber.from(2));
  });
});

describe('updateRequesterAdmin', function () {
  context('If the caller is the requester admin', async function () {
    it('updates the requester admin', async function () {
      const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
      await expect(
        airnode.connect(roles.requesterAdmin).updateRequesterAdmin(requesterIndex, roles.updatedRequesterAdmin.address)
      )
        .to.emit(airnode, 'RequesterUpdated')
        .withArgs(requesterIndex, roles.updatedRequesterAdmin.address);
      const updatedRequesterAdmin = await airnode.requesterIndexToAdmin(requesterIndex);
      expect(updatedRequesterAdmin).to.equal(roles.updatedRequesterAdmin.address);
    });
  });
  context('If the caller is not the requester admin', async function () {
    it('reverts', async function () {
      const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
      await expect(
        airnode.connect(roles.randomPerson).updateRequesterAdmin(requesterIndex, roles.updatedRequesterAdmin.address)
      ).to.be.revertedWith('Caller is not requester admin');
    });
  });

  describe('updateClientEndorsementStatus', function () {
    context('If the caller is the requester admin', async function () {
      it('updates the client endorsement status', async function () {
        const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
        // Verify that the client is initially not endorsed
        const endorsementStatus1 = await airnode.requesterIndexToClientAddressToEndorsementStatus(
          requesterIndex,
          roles.client.address
        );
        expect(endorsementStatus1).to.equal(false);
        // Endorse the client
        await expect(
          airnode
            .connect(roles.requesterAdmin)
            .updateClientEndorsementStatus(requesterIndex, roles.client.address, true)
        )
          .to.emit(airnode, 'ClientEndorsementStatusUpdated')
          .withArgs(requesterIndex, roles.client.address, true);
        const endorsementStatus2 = await airnode.requesterIndexToClientAddressToEndorsementStatus(
          requesterIndex,
          roles.client.address
        );
        expect(endorsementStatus2).to.equal(true);
        // Disendorse the client
        await expect(
          airnode
            .connect(roles.requesterAdmin)
            .updateClientEndorsementStatus(requesterIndex, roles.client.address, false)
        )
          .to.emit(airnode, 'ClientEndorsementStatusUpdated')
          .withArgs(requesterIndex, roles.client.address, false);
        const endorsementStatus3 = await airnode.requesterIndexToClientAddressToEndorsementStatus(
          requesterIndex,
          roles.client.address
        );
        expect(endorsementStatus3).to.equal(false);
      });
    });
    context('If the caller is not the requester admin', async function () {
      it('reverts', async function () {
        const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
        await expect(
          airnode.connect(roles.randomPerson).updateClientEndorsementStatus(requesterIndex, roles.client.address, false)
        ).to.be.revertedWith('Caller is not requester admin');
      });
    });
  });
});
