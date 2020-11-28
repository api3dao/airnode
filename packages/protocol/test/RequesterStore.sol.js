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
    const requesterInd = await createRequester(airnode, roles.requesterAdmin);
    const requesterAdmin = await airnode.requesterIndToAdmin(requesterInd);
    expect(requesterAdmin).to.equal(roles.requesterAdmin._address);
  });
  it('assigns requester indices incrementally', async function () {
    const requesterInd1 = await createRequester(airnode, roles.requesterAdmin);
    expect(requesterInd1).to.equal(ethers.BigNumber.from(1));
    const requesterInd2 = await createRequester(airnode, roles.requesterAdmin);
    expect(requesterInd2).to.equal(ethers.BigNumber.from(2));
  });
});

describe('updateRequesterAdmin', function () {
  context('If the caller is the requester admin', async function () {
    it('updates the requester admin', async function () {
      const requesterInd = await createRequester(airnode, roles.requesterAdmin);
      await expect(
        airnode.connect(roles.requesterAdmin).updateRequesterAdmin(requesterInd, roles.updatedRequesterAdmin._address)
      )
        .to.emit(airnode, 'RequesterUpdated')
        .withArgs(requesterInd, roles.updatedRequesterAdmin._address);
      const updatedRequesterAdmin = await airnode.requesterIndToAdmin(requesterInd);
      expect(updatedRequesterAdmin).to.equal(roles.updatedRequesterAdmin._address);
    });
  });
  context('If the caller is not the requester admin', async function () {
    it('reverts', async function () {
      const requesterInd = await createRequester(airnode, roles.requesterAdmin);
      await expect(
        airnode.connect(roles.randomPerson).updateRequesterAdmin(requesterInd, roles.updatedRequesterAdmin._address)
      ).to.be.revertedWith('Caller is not requester admin');
    });
  });

  describe('updateClientEndorsementStatus', function () {
    context('If the caller is the requester admin', async function () {
      it('updates the client endorsement status', async function () {
        const requesterInd = await createRequester(airnode, roles.requesterAdmin);
        // Verify that the client is initially not endorsed
        const endorsementStatus1 = await airnode.requesterIndToClientAddressToEndorsementStatus(
          requesterInd,
          roles.client._address
        );
        expect(endorsementStatus1).to.equal(false);
        // Endorse the client
        await expect(
          airnode.connect(roles.requesterAdmin).updateClientEndorsementStatus(requesterInd, roles.client._address, true)
        )
          .to.emit(airnode, 'ClientEndorsementStatusUpdated')
          .withArgs(requesterInd, roles.client._address, true);
        const endorsementStatus2 = await airnode.requesterIndToClientAddressToEndorsementStatus(
          requesterInd,
          roles.client._address
        );
        expect(endorsementStatus2).to.equal(true);
        // Disendorse the client
        await expect(
          airnode
            .connect(roles.requesterAdmin)
            .updateClientEndorsementStatus(requesterInd, roles.client._address, false)
        )
          .to.emit(airnode, 'ClientEndorsementStatusUpdated')
          .withArgs(requesterInd, roles.client._address, false);
        const endorsementStatus3 = await airnode.requesterIndToClientAddressToEndorsementStatus(
          requesterInd,
          roles.client._address
        );
        expect(endorsementStatus3).to.equal(false);
      });
    });
    context('If the caller is not the requester admin', async function () {
      it('reverts', async function () {
        const requesterInd = await createRequester(airnode, roles.requesterAdmin);
        await expect(
          airnode.connect(roles.randomPerson).updateClientEndorsementStatus(requesterInd, roles.client._address, false)
        ).to.be.revertedWith('Caller is not requester admin');
      });
    });
  });
});
