/* globals context ethers */

const { expect } = require('chai');

const AdminRank = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
};

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

describe('extendWhitelistExpiration', function () {
  context('SelfClientRrpAuthorizer', function () {
    context('Caller is the AirnodeRrp master wallet', function () {
      context('Provided expiration extends', function () {
        it('extends whitelist expiration', async function () {
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expiration = now + 100;
          await expect(
            selfClientRrpAuthorizer
              .connect(roles.airnodeMasterWallet)
              .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
          )
            .to.emit(selfClientRrpAuthorizer, 'ExtendedWhitelistExpiration')
            .withArgs(airnodeId, roles.client.address, expiration, roles.airnodeMasterWallet.address);
          expect(
            (
              await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address)
            ).expirationTimestamp.toNumber()
          ).to.equal(expiration);
        });
      });
      context('Provided expiration does not extend', function () {
        it('reverts', async function () {
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          await selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .extendWhitelistExpiration(airnodeId, roles.client.address, now);
          const expiration = now - 100;
          await expect(
            selfClientRrpAuthorizer
              .connect(roles.airnodeMasterWallet)
              .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
          ).to.be.revertedWith('Expiration not extended');
        });
      });
    });
    context('Caller is a superAdmin', function () {
      context('Provided expiration extends', function () {
        it('extends whitelist expiration', async function () {
          await selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setRank(airnodeId, roles.admin.address, AdminRank.SuperAdmin);
          expect(
            await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)
          ).to.equal(AdminRank.SuperAdmin);

          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expiration = now + 100;
          await expect(
            selfClientRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
          )
            .to.emit(selfClientRrpAuthorizer, 'ExtendedWhitelistExpiration')
            .withArgs(airnodeId, roles.client.address, expiration, roles.admin.address);
          expect(
            (
              await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address)
            ).expirationTimestamp.toNumber()
          ).to.equal(expiration);
        });
      });
      context('Provided expiration does not extend', function () {
        it('reverts', async function () {
          await selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setRank(airnodeId, roles.admin.address, AdminRank.SuperAdmin);
          expect(
            await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)
          ).to.equal(AdminRank.SuperAdmin);

          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          await selfClientRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(airnodeId, roles.client.address, now);
          const expiration = now - 100;
          await expect(
            selfClientRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
          ).to.be.revertedWith('Expiration not extended');
        });
      });
    });
    context('Caller is an admin', function () {
      context('Provided expiration extends', function () {
        it('extends whitelist expiration', async function () {
          await selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setRank(airnodeId, roles.admin.address, AdminRank.Admin);
          expect(
            await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)
          ).to.equal(AdminRank.Admin);

          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expiration = now + 100;
          await expect(
            selfClientRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
          )
            .to.emit(selfClientRrpAuthorizer, 'ExtendedWhitelistExpiration')
            .withArgs(airnodeId, roles.client.address, expiration, roles.admin.address);
          expect(
            (
              await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address)
            ).expirationTimestamp.toNumber()
          ).to.equal(expiration);
        });
      });
      context('Provided expiration does not extend', function () {
        it('reverts', async function () {
          await selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setRank(airnodeId, roles.admin.address, AdminRank.Admin);
          expect(
            await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)
          ).to.equal(AdminRank.Admin);

          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          await selfClientRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(airnodeId, roles.client.address, now);
          const expiration = now - 100;
          await expect(
            selfClientRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
          ).to.be.revertedWith('Expiration not extended');
        });
      });
    });
    context('Caller is unauthorized', function () {
      it('reverts', async function () {
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .setRank(airnodeId, roles.admin.address, AdminRank.Unauthorized);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.Unauthorized
        );

        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        const expiration = now + 100;
        await expect(
          selfClientRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
        ).to.be.revertedWith('Caller ranked low');
        expect(
          (
            await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(0);
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await expect(
          selfClientRrpAuthorizer
            .connect(roles.randomPerson)
            .extendWhitelistExpiration(airnodeId, roles.client.address, now)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
  context('Api3ClientRrpAuthorizer', function () {
    context('Caller is metaAdmin', function () {
      context('Provided expiration extends', function () {
        it('extends whitelist expiration', async function () {
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expiration = now + 100;
          await expect(
            api3ClientRrpAuthorizer
              .connect(roles.metaAdmin)
              .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration)
          )
            .to.emit(api3ClientRrpAuthorizer, 'ExtendedWhitelistExpiration')
            .withArgs(api3AdminnedEntity, roles.client.address, expiration, roles.metaAdmin.address);
          expect(
            (
              await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address)
            ).expirationTimestamp.toNumber()
          ).to.equal(expiration);
        });
      });
      context('Provided expiration does not extend', function () {
        it('reverts', async function () {
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          await api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, now);
          const expiration = now - 100;
          await expect(
            api3ClientRrpAuthorizer
              .connect(roles.metaAdmin)
              .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration)
          ).to.be.revertedWith('Expiration not extended');
        });
      });
    });
    context('Caller is a superAdmin', function () {
      context('Provided expiration extends', function () {
        it('extends whitelist expiration', async function () {
          await api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.SuperAdmin);
          expect(
            await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
          ).to.equal(AdminRank.SuperAdmin);

          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expiration = now + 100;
          await expect(
            api3ClientRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration)
          )
            .to.emit(api3ClientRrpAuthorizer, 'ExtendedWhitelistExpiration')
            .withArgs(api3AdminnedEntity, roles.client.address, expiration, roles.admin.address);
          expect(
            (
              await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address)
            ).expirationTimestamp.toNumber()
          ).to.equal(expiration);
        });
      });
      context('Provided expiration does not extend', function () {
        it('reverts', async function () {
          await api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.SuperAdmin);
          expect(
            await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
          ).to.equal(AdminRank.SuperAdmin);

          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          await api3ClientRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, now);
          const expiration = now - 100;
          await expect(
            api3ClientRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration)
          ).to.be.revertedWith('Expiration not extended');
        });
      });
    });
    context('Caller is an admin', function () {
      context('Provided expiration extends', function () {
        it('extends whitelist expiration', async function () {
          await api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.Admin);
          expect(
            await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
          ).to.equal(AdminRank.Admin);

          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expiration = now + 100;
          await expect(
            api3ClientRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration)
          )
            .to.emit(api3ClientRrpAuthorizer, 'ExtendedWhitelistExpiration')
            .withArgs(api3AdminnedEntity, roles.client.address, expiration, roles.admin.address);
          expect(
            (
              await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address)
            ).expirationTimestamp.toNumber()
          ).to.equal(expiration);
        });
      });
      context('Provided expiration does not extend', function () {
        it('reverts', async function () {
          await api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.Admin);
          expect(
            await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
          ).to.equal(AdminRank.Admin);

          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          await api3ClientRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, now);
          const expiration = now - 100;
          await expect(
            api3ClientRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration)
          ).to.be.revertedWith('Expiration not extended');
        });
      });
    });
    context('Caller is unauthorized', function () {
      it('reverts', async function () {
        await api3ClientRrpAuthorizer
          .connect(roles.metaAdmin)
          .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.Unauthorized);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(AdminRank.Unauthorized);

        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        const expiration = now + 100;
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration)
        ).to.be.revertedWith('Caller ranked low');
        expect(
          (
            await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(0);
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.randomPerson)
            .extendWhitelistExpiration(api3AdminnedEntity, roles.client.address, now)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
});

describe('setWhitelistExpiration', function () {
  context('SelfClientRrpAuthorizer', function () {
    context('Caller is the AirnodeRrp master wallet', function () {
      it('sets whitelist expiration', async function () {
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        const expiration = now + 100;
        await expect(
          selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setWhitelistExpiration(airnodeId, roles.client.address, expiration)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(airnodeId, roles.client.address, expiration, roles.airnodeMasterWallet.address);
        expect(
          (
            await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(expiration);

        await expect(
          selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setWhitelistExpiration(airnodeId, roles.client.address, now)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(airnodeId, roles.client.address, now, roles.airnodeMasterWallet.address);
        expect(
          (
            await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(now);
      });
    });
    context('Caller is a superAdmin', async function () {
      it('sets whitelist expiration', async function () {
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .setRank(airnodeId, roles.admin.address, AdminRank.SuperAdmin);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.SuperAdmin
        );

        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        const expiration = now + 100;
        await expect(
          selfClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistExpiration(airnodeId, roles.client.address, expiration)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(airnodeId, roles.client.address, expiration, roles.admin.address);
        expect(
          (
            await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(expiration);

        await expect(
          selfClientRrpAuthorizer.connect(roles.admin).setWhitelistExpiration(airnodeId, roles.client.address, now)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(airnodeId, roles.client.address, now, roles.admin.address);
        expect(
          (
            await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(now);
      });
    });
    context('Caller is an admin', function () {
      it('reverts', async function () {
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .setRank(airnodeId, roles.admin.address, AdminRank.Admin);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.Admin
        );

        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await expect(
          selfClientRrpAuthorizer.connect(roles.admin).setWhitelistExpiration(airnodeId, roles.client.address, now)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is unauthorized', function () {
      it('reverts', async function () {
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .setRank(airnodeId, roles.admin.address, AdminRank.Unauthorized);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.Unauthorized
        );

        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await expect(
          selfClientRrpAuthorizer.connect(roles.admin).setWhitelistExpiration(airnodeId, roles.client.address, now)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await expect(
          selfClientRrpAuthorizer
            .connect(roles.randomPerson)
            .setWhitelistExpiration(airnodeId, roles.client.address, now)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
  context('Api3ClientRrpAuthorizer', function () {
    context('Caller is metaAdmin', function () {
      it('sets whitelist expiration', async function () {
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        const expiration = now + 100;
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(api3AdminnedEntity, roles.client.address, expiration, roles.metaAdmin.address);
        expect(
          (
            await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(expiration);

        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistExpiration(api3AdminnedEntity, roles.client.address, now)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(api3AdminnedEntity, roles.client.address, now, roles.metaAdmin.address);
        expect(
          (
            await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(now);
      });
    });
    context('Caller is a superAdmin', async function () {
      it('sets whitelist expiration', async function () {
        await api3ClientRrpAuthorizer
          .connect(roles.metaAdmin)
          .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.SuperAdmin);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(AdminRank.SuperAdmin);

        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        const expiration = now + 100;
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(api3AdminnedEntity, roles.client.address, expiration, roles.admin.address);
        expect(
          (
            await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(expiration);

        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistExpiration(api3AdminnedEntity, roles.client.address, now)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(api3AdminnedEntity, roles.client.address, now, roles.admin.address);
        expect(
          (
            await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address)
          ).expirationTimestamp.toNumber()
        ).to.equal(now);
      });
    });
    context('Caller is an admin', function () {
      it('reverts', async function () {
        await api3ClientRrpAuthorizer
          .connect(roles.metaAdmin)
          .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.Admin);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(AdminRank.Admin);

        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistExpiration(api3AdminnedEntity, roles.client.address, now)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is unauthorized', function () {
      it('reverts', async function () {
        await api3ClientRrpAuthorizer
          .connect(roles.metaAdmin)
          .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.Unauthorized);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(AdminRank.Unauthorized);

        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistExpiration(api3AdminnedEntity, roles.client.address, now)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.randomPerson)
            .setWhitelistExpiration(api3AdminnedEntity, roles.client.address, now)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
});

describe('setWhitelistStatusPastExpiration', function () {
  context('SelfClientRrpAuthorizer', function () {
    context('Caller is the AirnodeRrp master wallet', function () {
      it('sets Whitelist status', async function () {
        await expect(
          selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, true)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(airnodeId, roles.client.address, true, roles.airnodeMasterWallet.address);
        expect(
          (await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address))
            .whitelistPastExpiration
        ).to.equal(true);

        await expect(
          selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, false)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(airnodeId, roles.client.address, false, roles.airnodeMasterWallet.address);
        expect(
          (await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address))
            .whitelistPastExpiration
        ).to.equal(false);
      });
    });
    context('Caller is a super admin', async function () {
      it('sets Whitelist status', async function () {
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .setRank(airnodeId, roles.admin.address, AdminRank.SuperAdmin);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.SuperAdmin
        );

        await expect(
          selfClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, true)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(airnodeId, roles.client.address, true, roles.admin.address);
        expect(
          (await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address))
            .whitelistPastExpiration
        ).to.equal(true);

        await expect(
          selfClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, false)
        )
          .to.emit(selfClientRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(airnodeId, roles.client.address, false, roles.admin.address);
        expect(
          (await selfClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(airnodeId, roles.client.address))
            .whitelistPastExpiration
        ).to.equal(false);
      });
    });
    context('Caller is an admin', function () {
      it('reverts', async function () {
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .setRank(airnodeId, roles.admin.address, AdminRank.Admin);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.Admin
        );
        await expect(
          selfClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, true)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is unauthorized', function () {
      it('reverts', async function () {
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .setRank(airnodeId, roles.admin.address, AdminRank.Unauthorized);
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.Unauthorized
        );
        await expect(
          selfClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, true)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        await expect(
          selfClientRrpAuthorizer
            .connect(roles.randomPerson)
            .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, true)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });

  context('Api3ClientRrpAuthorizer', function () {
    context('Caller is metaAdmin', function () {
      it('sets Whitelist status', async function () {
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(api3AdminnedEntity, roles.client.address, true)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(api3AdminnedEntity, roles.client.address, true, roles.metaAdmin.address);
        expect(
          (await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address))
            .whitelistPastExpiration
        ).to.equal(true);

        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(api3AdminnedEntity, roles.client.address, false)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(api3AdminnedEntity, roles.client.address, false, roles.metaAdmin.address);
        expect(
          (await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address))
            .whitelistPastExpiration
        ).to.equal(false);
      });
    });
    context('Caller is a super admin', async function () {
      it('sets Whitelist status', async function () {
        await api3ClientRrpAuthorizer
          .connect(roles.metaAdmin)
          .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.SuperAdmin);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(AdminRank.SuperAdmin);

        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(api3AdminnedEntity, roles.client.address, true)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(api3AdminnedEntity, roles.client.address, true, roles.admin.address);
        expect(
          (await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address))
            .whitelistPastExpiration
        ).to.equal(true);

        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(api3AdminnedEntity, roles.client.address, false)
        )
          .to.emit(api3ClientRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(api3AdminnedEntity, roles.client.address, false, roles.admin.address);
        expect(
          (await api3ClientRrpAuthorizer.serviceIdToClientToWhitelistStatus(api3AdminnedEntity, roles.client.address))
            .whitelistPastExpiration
        ).to.equal(false);
      });
    });
    context('Caller is an admin', function () {
      it('reverts', async function () {
        await api3ClientRrpAuthorizer
          .connect(roles.metaAdmin)
          .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.Admin);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(AdminRank.Admin);
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(api3AdminnedEntity, roles.client.address, true)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is unauthorized', function () {
      it('reverts', async function () {
        await api3ClientRrpAuthorizer
          .connect(roles.metaAdmin)
          .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.Unauthorized);
        expect(
          await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
        ).to.equal(AdminRank.Unauthorized);
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(api3AdminnedEntity, roles.client.address, true)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
    context('Caller is a randomPerson for which no rank has been set', function () {
      it('reverts', async function () {
        await expect(
          api3ClientRrpAuthorizer
            .connect(roles.randomPerson)
            .setWhitelistStatusPastExpiration(api3AdminnedEntity, roles.client.address, true)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
});
