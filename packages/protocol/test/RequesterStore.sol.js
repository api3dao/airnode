const { expect } = require('chai');
const { verifyLog } = require('./util');

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
    const tx = await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
    const log = await verifyLog(airnode, tx, 'RequesterCreated(uint256,address)', {
      admin: roles.requesterAdmin._address,
    });
    const requesterAdmin = await airnode.getRequesterAdmin(log.args.requesterInd);
    expect(requesterAdmin).to.equal(roles.requesterAdmin._address);
  });
  it('assigns requester indices incrementally', async function () {
    const tx1 = await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
    const log1 = await verifyLog(airnode, tx1, 'RequesterCreated(uint256,address)', {
      admin: roles.requesterAdmin._address,
    });
    expect(log1.args.requesterInd).to.equal(ethers.BigNumber.from(1));
    const tx2 = await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
    const log2 = await verifyLog(airnode, tx2, 'RequesterCreated(uint256,address)', {
      admin: roles.requesterAdmin._address,
    });
    expect(log2.args.requesterInd).to.equal(ethers.BigNumber.from(2));
  });
});

describe('updateRequesterAdmin', function () {
  context('If the caller is the requester admin', async function () {
    it('updates the requester admin', async function () {
      await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
      await expect(
        airnode
          .connect(roles.requesterAdmin)
          .updateRequesterAdmin(ethers.BigNumber.from(1), roles.updatedRequesterAdmin._address)
      )
        .to.emit(airnode, 'RequesterUpdated')
        .withArgs(ethers.BigNumber.from(1), roles.updatedRequesterAdmin._address);
      const updatedRequesterAdmin = await airnode.getRequesterAdmin(ethers.BigNumber.from(1));
      expect(updatedRequesterAdmin).to.equal(roles.updatedRequesterAdmin._address);
    });
  });
  context('If the caller is not the requester admin', async function () {
    it('reverts', async function () {
      await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
      await expect(
        airnode
          .connect(roles.randomPerson)
          .updateRequesterAdmin(ethers.BigNumber.from(1), roles.updatedRequesterAdmin._address)
      ).to.be.revertedWith('Caller is not requester admin');
    });
  });

  describe('updateClientEndorsementStatus', function () {
    context('If the caller is the requester admin', async function () {
      it('updates the client endorsement status', async function () {
        await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
        // Verify that the client is initially not endorsed
        const endorsementStatus1 = await airnode.getRequesterEndorsementStatusOfClientAddress(
          ethers.BigNumber.from(1),
          roles.client._address
        );
        expect(endorsementStatus1).to.equal(false);
        // Endorse the client
        await expect(
          airnode
            .connect(roles.requesterAdmin)
            .updateClientEndorsementStatus(ethers.BigNumber.from(1), roles.client._address, true)
        )
          .to.emit(airnode, 'ClientEndorsementStatusUpdated')
          .withArgs(ethers.BigNumber.from(1), roles.client._address, true);
        const endorsementStatus2 = await airnode.getRequesterEndorsementStatusOfClientAddress(
          ethers.BigNumber.from(1),
          roles.client._address
        );
        expect(endorsementStatus2).to.equal(true);
        // Disendorse the client
        await expect(
          airnode
            .connect(roles.requesterAdmin)
            .updateClientEndorsementStatus(ethers.BigNumber.from(1), roles.client._address, false)
        )
          .to.emit(airnode, 'ClientEndorsementStatusUpdated')
          .withArgs(ethers.BigNumber.from(1), roles.client._address, false);
        const endorsementStatus3 = await airnode.getRequesterEndorsementStatusOfClientAddress(
          ethers.BigNumber.from(1),
          roles.client._address
        );
        expect(endorsementStatus3).to.equal(false);
      });
    });
    context('If the caller is not the requester admin', async function () {
      it('reverts', async function () {
        await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
        await expect(
          airnode
            .connect(roles.randomPerson)
            .updateClientEndorsementStatus(ethers.BigNumber.from(1), roles.client._address, false)
        ).to.be.revertedWith('Caller is not requester admin');
      });
    });
  });
});
