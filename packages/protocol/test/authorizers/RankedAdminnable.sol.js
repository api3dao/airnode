/* globals context ethers */

const { expect } = require('chai');

let roles;
let selfClientRrpAuthorizer;
let api3ClientRrpAuthorizer;
let airnodeRrp;
let airnodeId;
const api3AdminnedEntity = ethers.constants.HashZero;

// methods that are ovverriden are tested in their respective contracts

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    airnodeMasterWallet: accounts[1],
    admin: accounts[2],
    client: accounts[3],
    superAdmin: accounts[4],
    metaAdmin: accounts[5],
    randomPerson: accounts[9],
  };

  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const selfClientRrpAuthorizerFactory = await ethers.getContractFactory('SelfClientRrpAuthorizer', roles.deployer);
  selfClientRrpAuthorizer = await selfClientRrpAuthorizerFactory.deploy();
  airnodeId = await airnodeRrp
    .connect(roles.airnodeMasterWallet)
    .callStatic.setAirnodeParameters('xpub...', [selfClientRrpAuthorizer.address]);
  await airnodeRrp
    .connect(roles.airnodeMasterWallet)
    .setAirnodeParameters('xpub...', [selfClientRrpAuthorizer.address]);

  const api3ClientRrpAuthorizerFactory = await ethers.getContractFactory('Api3ClientRrpAuthorizer', roles.deployer);
  api3ClientRrpAuthorizer = await api3ClientRrpAuthorizerFactory.deploy(roles.metaAdmin.address);
});

describe('setRank', function () {
  context('SelfClientRrpAuthorizer', function () {
    context('Caller is the AirnodeRrp master wallet', function () {
      it('sets admin rank', async function () {
        // Sets rank 1
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 1);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          1
        );

        // Back to 0
        await expect(
          selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 0)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetRank')
          .withArgs(airnodeId, roles.admin.address, 0, roles.airnodeMasterWallet.address);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          0
        );
      });
      it('sets admin rank but this time checks that airnodeMasterWallet has higher rank than previous rank set', async function () {
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          10
        );

        // new rank is 9 but onlyWithRank modifier will check against 10 since it's higher
        await expect(
          selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 9)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetRank')
          .withArgs(airnodeId, roles.admin.address, 9, roles.airnodeMasterWallet.address);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          9
        );
      });
    });
    context('Caller is an admin with current higher rank', function () {
      it('sets client rank', async function () {
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          10
        );

        await expect(selfClientRrpAuthorizer.connect(roles.admin).setRank(airnodeId, roles.client.address, 1))
          .to.emit(selfClientRrpAuthorizer, 'SetRank')
          .withArgs(airnodeId, roles.client.address, 1, roles.admin.address);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.client.address)).to.equal(
          1
        );
      });
    });
    context('Caller is an admin with current lower rank', function () {
      it('reverts', async function () {
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          10
        );

        await expect(
          selfClientRrpAuthorizer.connect(roles.admin).setRank(airnodeId, roles.client.address, 100)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        await expect(
          selfClientRrpAuthorizer.connect(roles.randomPerson).setRank(airnodeId, roles.admin.address, 1)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
  context('Api3ClientRrpAuthorizer', function () {
    context('Caller is the metaAdmin', function () {
      it('sets admin rank', async function () {
        // Sets rank 1
        await api3ClientRrpAuthorizer.connect(roles.metaAdmin).setRank(api3AdminnedEntity, roles.admin.address, 1);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(1);

        // Back to 0
        await expect(
          api3ClientRrpAuthorizer.connect(roles.metaAdmin).setRank(api3AdminnedEntity, roles.admin.address, 0)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetRank')
          .withArgs(api3AdminnedEntity, roles.admin.address, 0, roles.metaAdmin.address);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(0);
      });
      it('sets admin rank but this time checks that metaAdmin has higher rank than previous rank set', async function () {
        await api3ClientRrpAuthorizer.connect(roles.metaAdmin).setRank(api3AdminnedEntity, roles.admin.address, 10);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(10);

        // new rank is 9 but onlyWithRank modifier will check against 10 since it's higher
        await expect(
          api3ClientRrpAuthorizer.connect(roles.metaAdmin).setRank(api3AdminnedEntity, roles.admin.address, 9)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetRank')
          .withArgs(api3AdminnedEntity, roles.admin.address, 9, roles.metaAdmin.address);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(9);
      });
    });
    context('Caller is an admin with current higher rank', function () {
      it('sets client rank', async function () {
        await api3ClientRrpAuthorizer.connect(roles.metaAdmin).setRank(api3AdminnedEntity, roles.admin.address, 10);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(10);

        await expect(api3ClientRrpAuthorizer.connect(roles.admin).setRank(api3AdminnedEntity, roles.client.address, 1))
          .to.emit(api3ClientRrpAuthorizer, 'SetRank')
          .withArgs(api3AdminnedEntity, roles.client.address, 1, roles.admin.address);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.client.address)
        ).to.equal(1);
      });
    });
    context('Caller is an admin with current lower rank', function () {
      it('reverts', async function () {
        await api3ClientRrpAuthorizer.connect(roles.metaAdmin).setRank(api3AdminnedEntity, roles.admin.address, 10);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(10);

        await expect(
          api3ClientRrpAuthorizer.connect(roles.admin).setRank(api3AdminnedEntity, roles.client.address, 100)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        await expect(
          api3ClientRrpAuthorizer.connect(roles.randomPerson).setRank(api3AdminnedEntity, roles.admin.address, 1)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
});

describe('decreaseSelfRank', function () {
  context('SelfClientRrpAuthorizer', function () {
    context('Caller is the AirnodeRrp master wallet', function () {
      it('decreases self rank', async function () {
        await expect(selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).decreaseSelfRank(airnodeId, 1))
          .to.emit(selfClientRrpAuthorizer, 'DecreasedSelfRank')
          .withArgs(airnodeId, roles.airnodeMasterWallet.address, 1);
        expect(
          await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.airnodeMasterWallet.address)
        ).to.equal(1);
      });
    });
    context('Caller rank is higher than current', function () {
      it('decreases self rank', async function () {
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          10
        );

        await expect(selfClientRrpAuthorizer.connect(roles.admin).decreaseSelfRank(airnodeId, 9))
          .to.emit(selfClientRrpAuthorizer, 'DecreasedSelfRank')
          .withArgs(airnodeId, roles.admin.address, 9);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          9
        );
      });
    });
    context('Caller rank is lower than current', function () {
      it('reverts', async function () {
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          10
        );

        await expect(selfClientRrpAuthorizer.connect(roles.admin).decreaseSelfRank(airnodeId, 11)).to.be.revertedWith(
          'Caller ranked low'
        );
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        await expect(
          selfClientRrpAuthorizer.connect(roles.randomPerson).decreaseSelfRank(airnodeId, 1)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
  context('Api3ClientRrpAuthorizer', function () {
    context('Caller is the metaAdmin', function () {
      it('decreases self rank', async function () {
        await expect(api3ClientRrpAuthorizer.connect(roles.metaAdmin).decreaseSelfRank(api3AdminnedEntity, 1))
          .to.emit(api3ClientRrpAuthorizer, 'DecreasedSelfRank')
          .withArgs(api3AdminnedEntity, roles.metaAdmin.address, 1);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.metaAdmin.address)
        ).to.equal(1);
      });
    });
    context('Caller rank is higher than current', function () {
      it('decreases self rank', async function () {
        await api3ClientRrpAuthorizer.connect(roles.metaAdmin).setRank(api3AdminnedEntity, roles.admin.address, 10);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(10);

        await expect(api3ClientRrpAuthorizer.connect(roles.admin).decreaseSelfRank(api3AdminnedEntity, 9))
          .to.emit(api3ClientRrpAuthorizer, 'DecreasedSelfRank')
          .withArgs(api3AdminnedEntity, roles.admin.address, 9);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(9);
      });
    });
    context('Caller rank is lower than current', function () {
      it('reverts', async function () {
        await api3ClientRrpAuthorizer.connect(roles.metaAdmin).setRank(api3AdminnedEntity, roles.admin.address, 10);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(10);

        await expect(
          api3ClientRrpAuthorizer.connect(roles.admin).decreaseSelfRank(api3AdminnedEntity, 11)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        await expect(
          api3ClientRrpAuthorizer.connect(roles.randomPerson).decreaseSelfRank(api3AdminnedEntity, 1)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
});
