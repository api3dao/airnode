/* globals context ethers */

const { expect } = require('chai');

const AdminRank = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
};

let roles;
let selfClientRrpAuthorizer;
let airnodeRrp;
let airnodeId;
const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    airnodeMasterWallet: accounts[1],
    admin: accounts[2],
    client: accounts[3],
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
});

describe('constructor', function () {
  it('initializes correctly', async function () {
    expect(await selfClientRrpAuthorizer.AUTHORIZER_TYPE()).to.equal(1);
  });
});

describe('getRank', function () {
  context('Caller is the SelfClientRrpAuthorizer deployer', function () {
    it('returns zero if admin rank has not been set', async function () {
      expect(
        await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.airnodeMasterWallet.address)
      ).to.equal(0);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(0);
      expect(
        await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.randomPerson.address)
      ).to.equal(0);
    });
  });
  context('Caller is the AirnodeRrp master wallet', function () {
    it('returns MAX_RANK', async function () {
      expect(
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .getRank(airnodeId, roles.airnodeMasterWallet.address)
      ).to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
      expect(
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).getRank(airnodeId, roles.admin.address)
      ).to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
      expect(
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).getRank(airnodeId, roles.randomPerson.address)
      ).to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
    });
  });
});

describe('setRank', function () {
  context('Caller is the AirnodeRrp master wallet', function () {
    it('sets admin rank', async function () {
      // Sets rank 1
      await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 1);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(1);

      // Back to 0
      await expect(
        selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 0)
      )
        .to.emit(selfClientRrpAuthorizer, 'SetRank')
        .withArgs(airnodeId, roles.admin.address, 0, roles.airnodeMasterWallet.address);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(0);
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
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(9);
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

describe('decreaseSelfRank', function () {
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
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(9);
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

describe('extendWhitelistExpiration', function () {
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
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.SuperAdmin
        );

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
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.SuperAdmin
        );

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
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.Admin
        );

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
        expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
          AdminRank.Admin
        );

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

describe('setWhitelistExpiration', function () {
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
        selfClientRrpAuthorizer.connect(roles.admin).setWhitelistExpiration(airnodeId, roles.client.address, expiration)
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
        selfClientRrpAuthorizer.connect(roles.randomPerson).setWhitelistExpiration(airnodeId, roles.client.address, now)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('setWhitelistStatusPastExpiration', function () {
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

describe('isAuthorized', function () {
  context('Designated wallet balance is not zero', function () {
    context('Client is not Whitelisted', function () {
      context('Client whitelisting has not expired', function () {
        it('returns true', async function () {
          const designatedWallet = ethers.Wallet.createRandom();
          await roles.client.sendTransaction({
            to: designatedWallet.address,
            value: 1,
          });
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expiration = now + 100;
          await selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setRank(airnodeId, roles.admin.address, AdminRank.SuperAdmin);
          await selfClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistExpiration(airnodeId, roles.client.address, expiration);
          expect(
            await selfClientRrpAuthorizer.isAuthorized(
              requestId,
              airnodeId,
              endpointId,
              roles.admin.address,
              designatedWallet.address,
              roles.client.address
            )
          ).to.equal(true);
        });
      });
      context('Client whitelisting has expired and whitelisting has not been set', function () {
        it('returns false', async function () {
          const designatedWallet = ethers.Wallet.createRandom();
          await roles.client.sendTransaction({
            to: designatedWallet.address,
            value: 1,
          });
          expect(
            await selfClientRrpAuthorizer.isAuthorized(
              requestId,
              airnodeId,
              endpointId,
              roles.admin.address,
              designatedWallet.address,
              roles.client.address
            )
          ).to.equal(false);
        });
      });
    });
    context('Client whitelisting was set then revoked', function () {
      it('returns false', async function () {
        const designatedWallet = ethers.Wallet.createRandom();
        await roles.client.sendTransaction({
          to: designatedWallet.address,
          value: 1,
        });
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .setRank(airnodeId, roles.admin.address, AdminRank.SuperAdmin);
        await selfClientRrpAuthorizer
          .connect(roles.admin)
          .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, true);
        expect(
          await selfClientRrpAuthorizer.isAuthorized(
            requestId,
            airnodeId,
            endpointId,
            roles.admin.address,
            designatedWallet.address,
            roles.client.address
          )
        ).to.equal(true);
        await selfClientRrpAuthorizer
          .connect(roles.admin)
          .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, false);
        expect(
          await selfClientRrpAuthorizer.isAuthorized(
            requestId,
            airnodeId,
            endpointId,
            roles.admin.address,
            designatedWallet.address,
            roles.client.address
          )
        ).to.equal(false);
      });
    });
  });
  context('Designated wallet balance is zero', function () {
    it('returns false', async function () {
      const designatedWallet = ethers.Wallet.createRandom();
      const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
      const expiration = now + 100;
      await selfClientRrpAuthorizer
        .connect(roles.airnodeMasterWallet)
        .setWhitelistExpiration(airnodeId, roles.client.address, expiration);
      expect(
        await selfClientRrpAuthorizer.isAuthorized(
          requestId,
          airnodeId,
          endpointId,
          roles.airnodeMasterWallet.address,
          designatedWallet.address,
          roles.client.address
        )
      ).to.equal(false);
    });
  });
});
