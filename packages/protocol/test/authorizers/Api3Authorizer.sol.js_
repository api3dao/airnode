/* globals context ethers */

const { expect } = require('chai');

const AdminStatus = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
};

let roles;
let api3Authorizer;
const airnodeId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const requesterIndex = 123;
const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    newMetaAdmin: accounts[2],
    superAdmin: accounts[3],
    admin: accounts[4],
    client: accounts[5],
    randomPerson: accounts[9],
  };
  const api3AuthorizerFactory = await ethers.getContractFactory('Api3Authorizer', roles.deployer);
  api3Authorizer = await api3AuthorizerFactory.deploy(roles.metaAdmin.address);
});

describe('constructor', function () {
  context('Meta admin address is non-zero', function () {
    it('initializes correctly', async function () {
      expect(await api3Authorizer.authorizerType()).to.equal(1);
      expect(await api3Authorizer.metaAdmin()).to.equal(roles.metaAdmin.address);
    });
  });
  context('Meta admin address is zero', function () {
    it('reverts', async function () {
      const api3AuthorizerFactory = await ethers.getContractFactory('Api3Authorizer', roles.deployer);
      await expect(api3AuthorizerFactory.deploy(ethers.constants.AddressZero)).to.be.revertedWith('Zero address');
    });
  });
});

describe('setMetaAdmin', function () {
  context('Caller is the meta admin', async function () {
    context('Address to be set as meta admin is non-zero', async function () {
      it('transfers master adminship', async function () {
        await expect(api3Authorizer.connect(roles.metaAdmin).setMetaAdmin(roles.newMetaAdmin.address))
          .to.emit(api3Authorizer, 'SetMetaAdmin')
          .withArgs(roles.newMetaAdmin.address);
      });
    });
    context('Address to be set as meta admin is non-zero', async function () {
      it('reverts', async function () {
        await expect(
          api3Authorizer.connect(roles.metaAdmin).setMetaAdmin(ethers.constants.AddressZero)
        ).to.be.revertedWith('Zero address');
      });
    });
  });
  context('Caller is not the meta admin', async function () {
    it('reverts', async function () {
      await expect(
        api3Authorizer.connect(roles.randomPerson).setMetaAdmin(roles.newMetaAdmin.address)
      ).to.be.revertedWith('Unauthorized');
    });
  });
});

describe('setAdminStatus', function () {
  context('Caller is the meta admin', async function () {
    it('sets admin status', async function () {
      // Give admin status
      await expect(api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Admin))
        .to.emit(api3Authorizer, 'SetAdminStatus')
        .withArgs(roles.admin.address, AdminStatus.Admin);
      expect(await api3Authorizer.adminStatuses(roles.admin.address)).to.equal(AdminStatus.Admin);
      // Revoke admin status
      await expect(
        api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Unauthorized)
      )
        .to.emit(api3Authorizer, 'SetAdminStatus')
        .withArgs(roles.admin.address, AdminStatus.Unauthorized);
      expect(await api3Authorizer.adminStatuses(roles.admin.address)).to.equal(AdminStatus.Unauthorized);
    });
    it('sets super admin status', async function () {
      // Give super admin status
      await expect(
        api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin)
      )
        .to.emit(api3Authorizer, 'SetAdminStatus')
        .withArgs(roles.superAdmin.address, AdminStatus.SuperAdmin);
      expect(await api3Authorizer.adminStatuses(roles.superAdmin.address)).to.equal(AdminStatus.SuperAdmin);
      // Revoke super admin status
      await expect(
        api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.Unauthorized)
      )
        .to.emit(api3Authorizer, 'SetAdminStatus')
        .withArgs(roles.superAdmin.address, AdminStatus.Unauthorized);
      expect(await api3Authorizer.adminStatuses(roles.superAdmin.address)).to.equal(AdminStatus.Unauthorized);
    });
  });
  context('Caller is not the meta admin', async function () {
    it('reverts', async function () {
      await expect(
        api3Authorizer.connect(roles.randomPerson).setAdminStatus(roles.admin.address, AdminStatus.Admin)
      ).to.be.revertedWith('Unauthorized');
      await expect(
        api3Authorizer.connect(roles.randomPerson).setAdminStatus(roles.admin.address, AdminStatus.SuperAdmin)
      ).to.be.revertedWith('Unauthorized');
    });
  });
});

describe('renounceAdminStatus', function () {
  context('Caller is an admin', async function () {
    it('renounces admin status', async function () {
      await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Admin);
      await expect(api3Authorizer.connect(roles.admin).renounceAdminStatus())
        .to.emit(api3Authorizer, 'RenouncedAdminStatus')
        .withArgs(roles.admin.address);
      expect(await api3Authorizer.adminStatuses(roles.admin.address)).to.equal(AdminStatus.Unauthorized);
    });
  });
  context('Caller is a super admin', async function () {
    it('renounces admin status', async function () {
      await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin);
      await expect(api3Authorizer.connect(roles.superAdmin).renounceAdminStatus())
        .to.emit(api3Authorizer, 'RenouncedAdminStatus')
        .withArgs(roles.superAdmin.address);
      expect(await api3Authorizer.adminStatuses(roles.superAdmin.address)).to.equal(AdminStatus.Unauthorized);
    });
  });
  context('Caller is not an admin', async function () {
    it('reverts', async function () {
      await expect(api3Authorizer.connect(roles.randomPerson).renounceAdminStatus()).to.be.revertedWith('Unauthorized');
    });
  });
});

describe('extendWhitelistExpiration', function () {
  context('Caller is an admin', function () {
    context('Provided expiration extends', function () {
      it('extends whitelist expiration', async function () {
        await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Admin);
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await api3Authorizer.connect(roles.admin).extendWhitelistExpiration(airnodeId, roles.client.address, now);
        const expiration = now + 100;
        await expect(
          api3Authorizer.connect(roles.admin).extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
        )
          .to.emit(api3Authorizer, 'ExtendedWhitelistExpiration')
          .withArgs(airnodeId, roles.client.address, expiration, roles.admin.address);
        expect(
          await api3Authorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
        ).to.equal(expiration);
      });
    });
    context('Provided expiration does not extend', function () {
      it('reverts', async function () {
        await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Admin);
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await api3Authorizer.connect(roles.admin).extendWhitelistExpiration(airnodeId, roles.client.address, now);
        const expiration = now - 100;
        await expect(
          api3Authorizer.connect(roles.admin).extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller is a super admin', async function () {
    context('Provided expiration extends', function () {
      it('extends whitelist expiration', async function () {
        await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin);
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await api3Authorizer.connect(roles.superAdmin).extendWhitelistExpiration(airnodeId, roles.client.address, now);
        const expiration = now + 100;
        await expect(
          api3Authorizer
            .connect(roles.superAdmin)
            .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
        )
          .to.emit(api3Authorizer, 'ExtendedWhitelistExpiration')
          .withArgs(airnodeId, roles.client.address, expiration, roles.superAdmin.address);
        expect(
          await api3Authorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
        ).to.equal(expiration);
      });
    });
    context('Provided expiration does not extend', function () {
      it('reverts', async function () {
        await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin);
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        await api3Authorizer.connect(roles.superAdmin).extendWhitelistExpiration(airnodeId, roles.client.address, now);
        const expiration = now - 100;
        await expect(
          api3Authorizer
            .connect(roles.superAdmin)
            .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller is the meta admin', function () {
    context('Provided airnodeId-clientAddress pair is whitelisted', function () {
      context('Provided expiration extends', function () {
        it('extends whitelist expiration', async function () {
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          await api3Authorizer.connect(roles.metaAdmin).extendWhitelistExpiration(airnodeId, roles.client.address, now);
          const expiration = now + 100;
          await expect(
            api3Authorizer
              .connect(roles.metaAdmin)
              .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
          )
            .to.emit(api3Authorizer, 'ExtendedWhitelistExpiration')
            .withArgs(airnodeId, roles.client.address, expiration, roles.metaAdmin.address);
          expect(
            await api3Authorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
          ).to.equal(expiration);
        });
      });
      context('Provided expiration does not extend', function () {
        it('reverts', async function () {
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          await api3Authorizer.connect(roles.metaAdmin).extendWhitelistExpiration(airnodeId, roles.client.address, now);
          const expiration = now - 100;
          await expect(
            api3Authorizer
              .connect(roles.metaAdmin)
              .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
          ).to.be.revertedWith('Expiration not extended');
        });
      });
    });
  });
  context('Caller is not an admin', function () {
    it('reverts', async function () {
      const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
      await expect(
        api3Authorizer.connect(roles.randomPerson).extendWhitelistExpiration(airnodeId, roles.client.address, now)
      ).to.be.revertedWith('Unauthorized');
    });
  });
});

describe('setWhitelistExpiration', function () {
  context('Caller is a super admin', async function () {
    it('sets whitelist expiration', async function () {
      await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin);

      const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
      const expiration = now + 100;
      await expect(
        api3Authorizer.connect(roles.superAdmin).setWhitelistExpiration(airnodeId, roles.client.address, expiration)
      )
        .to.emit(api3Authorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeId, roles.client.address, expiration, roles.superAdmin.address);
      expect(
        await api3Authorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
      ).to.equal(expiration);
    });
  });
  context('Caller is the meta admin', async function () {
    it('sets whitelist expiration', async function () {
      const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
      const expiration = now + 100;
      await expect(
        api3Authorizer.connect(roles.metaAdmin).setWhitelistExpiration(airnodeId, roles.client.address, expiration)
      )
        .to.emit(api3Authorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeId, roles.client.address, expiration, roles.metaAdmin.address);
      expect(
        await api3Authorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
      ).to.equal(expiration);
    });
  });

  context('Caller is an admin', function () {
    it('reverts', async function () {
      await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Admin);
      const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
      await expect(
        api3Authorizer.connect(roles.admin).setWhitelistExpiration(airnodeId, roles.client.address, now)
      ).to.be.revertedWith('Unauthorized');
    });
  });
  context('Caller is not an admin', function () {
    it('reverts', async function () {
      const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
      await expect(
        api3Authorizer.connect(roles.randomPerson).setWhitelistExpiration(airnodeId, roles.client.address, now)
      ).to.be.revertedWith('Unauthorized');
    });
  });
});

describe('setWhitelistStatus', function () {
  context('Caller is a super admin', async function () {
    it('sets whitelist status', async function () {
      await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin);

      await expect(api3Authorizer.connect(roles.superAdmin).setWhitelistStatus(airnodeId, roles.client.address, true))
        .to.emit(api3Authorizer, 'SetWhitelistStatus')
        .withArgs(airnodeId, roles.client.address, true, roles.superAdmin.address);

      expect(await api3Authorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
        true
      );
    });
    it('revokes whitelist', async function () {
      await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin);

      await expect(api3Authorizer.connect(roles.superAdmin).setWhitelistStatus(airnodeId, roles.client.address, true))
        .to.emit(api3Authorizer, 'SetWhitelistStatus')
        .withArgs(airnodeId, roles.client.address, true, roles.superAdmin.address);
      expect(await api3Authorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
        true
      );

      await expect(api3Authorizer.connect(roles.superAdmin).setWhitelistStatus(airnodeId, roles.client.address, false))
        .to.emit(api3Authorizer, 'SetWhitelistStatus')
        .withArgs(airnodeId, roles.client.address, false, roles.superAdmin.address);

      expect(await api3Authorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
        false
      );
    });
  });
});

context('Caller is a meta admin', async function () {
  it('sets whitelist status', async function () {
    await expect(api3Authorizer.connect(roles.metaAdmin).setWhitelistStatus(airnodeId, roles.client.address, true))
      .to.emit(api3Authorizer, 'SetWhitelistStatus')
      .withArgs(airnodeId, roles.client.address, true, roles.metaAdmin.address);

    expect(await api3Authorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
      true
    );
  });

  it('revokes whitelist', async function () {
    await expect(api3Authorizer.connect(roles.metaAdmin).setWhitelistStatus(airnodeId, roles.client.address, true))
      .to.emit(api3Authorizer, 'SetWhitelistStatus')
      .withArgs(airnodeId, roles.client.address, true, roles.metaAdmin.address);
    expect(await api3Authorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
      true
    );

    await expect(api3Authorizer.connect(roles.metaAdmin).setWhitelistStatus(airnodeId, roles.client.address, false))
      .to.emit(api3Authorizer, 'SetWhitelistStatus')
      .withArgs(airnodeId, roles.client.address, false, roles.metaAdmin.address);
    expect(await api3Authorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
      false
    );
  });
});

context('Caller is an admin', function () {
  it('reverts', async function () {
    await api3Authorizer.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Admin);
    await expect(
      api3Authorizer.connect(roles.admin).setWhitelistStatus(airnodeId, roles.client.address, true)
    ).to.be.revertedWith('Unauthorized');
  });
});
context('Caller is not an admin', function () {
  it('reverts', async function () {
    await expect(
      api3Authorizer.connect(roles.randomPerson).setWhitelistStatus(airnodeId, roles.client.address, true)
    ).to.be.revertedWith('Unauthorized');
  });
});

describe('isAuthorized', function () {
  context('Designated wallet balance is not zero', function () {
    context('Client is whitelisted', function () {
      context('Client whitelisting has not expired', function () {
        it('returns true', async function () {
          const designatedWallet = ethers.Wallet.createRandom();
          await roles.client.sendTransaction({
            to: designatedWallet.address,
            value: 1,
          });
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expiration = now + 100;
          api3Authorizer.connect(roles.metaAdmin).setWhitelistExpiration(airnodeId, roles.client.address, expiration);
          expect(
            await api3Authorizer.isAuthorized(
              requestId,
              airnodeId,
              endpointId,
              requesterIndex,
              designatedWallet.address,
              roles.client.address
            )
          ).to.equal(true);
        });
      });
      context('Client whitelisting has expired and whitelist status has not been set', function () {
        it('returns false', async function () {
          const designatedWallet = ethers.Wallet.createRandom();
          await roles.client.sendTransaction({
            to: designatedWallet.address,
            value: 1,
          });
          expect(
            await api3Authorizer.isAuthorized(
              requestId,
              airnodeId,
              endpointId,
              requesterIndex,
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
        await api3Authorizer.connect(roles.metaAdmin).setWhitelistStatus(airnodeId, roles.client.address, true);
        expect(
          await api3Authorizer.isAuthorized(
            requestId,
            airnodeId,
            endpointId,
            requesterIndex,
            designatedWallet.address,
            roles.client.address
          )
        ).to.equal(true);

        await api3Authorizer.connect(roles.metaAdmin).setWhitelistStatus(airnodeId, roles.client.address, false);

        expect(
          await api3Authorizer.isAuthorized(
            requestId,
            airnodeId,
            endpointId,
            requesterIndex,
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
      api3Authorizer.connect(roles.metaAdmin).setWhitelistExpiration(airnodeId, roles.client.address, expiration);
      expect(
        await api3Authorizer.isAuthorized(
          requestId,
          airnodeId,
          endpointId,
          requesterIndex,
          designatedWallet.address,
          roles.client.address
        )
      ).to.equal(false);
    });
  });
});
