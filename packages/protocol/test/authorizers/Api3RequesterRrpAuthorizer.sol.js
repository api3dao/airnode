/* globals context */

const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

const AdminRank = Object.freeze({
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
  MetaAdmin: hre.ethers.BigNumber.from(2).pow(256).sub(1),
});

let roles;
let api3RequesterRrpAuthorizer;
let adminnedId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    admin: accounts[2],
    superAdmin: accounts[3],
    user: accounts[4],
    anotherSuperAdmin: accounts[5],
    randomPerson: accounts[9],
  };
  const api3RequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
    'Api3RequesterRrpAuthorizer',
    roles.deployer
  );
  api3RequesterRrpAuthorizer = await api3RequesterRrpAuthorizerFactory.deploy(roles.metaAdmin.address);
  adminnedId = utils.generateRandomBytes32();
  await api3RequesterRrpAuthorizer
    .connect(roles.metaAdmin)
    .setRank(hre.ethers.constants.HashZero, roles.admin.address, AdminRank.Admin);
  await api3RequesterRrpAuthorizer
    .connect(roles.metaAdmin)
    .setRank(hre.ethers.constants.HashZero, roles.superAdmin.address, AdminRank.SuperAdmin);
  await api3RequesterRrpAuthorizer
    .connect(roles.metaAdmin)
    .setRank(hre.ethers.constants.HashZero, roles.anotherSuperAdmin.address, AdminRank.SuperAdmin);
});

describe('constructor', function () {
  it('users correct AUTHORIZER_TYPE', async function () {
    expect(await api3RequesterRrpAuthorizer.AUTHORIZER_TYPE()).to.equal(2);
  });
});

describe('getRank', function () {
  context("metaAdmin's rank is being queried", function () {
    context('Admin ranks are queried for the zero ID', function () {
      it('returns highest possible rank', async function () {
        expect(
          await api3RequesterRrpAuthorizer.getRank(hre.ethers.constants.HashZero, roles.metaAdmin.address)
        ).to.be.equal(AdminRank.MetaAdmin);
      });
    });
    context('Admin ranks are queried for non zero ID', function () {
      it('reverts', async function () {
        expect(
          await expect(api3RequesterRrpAuthorizer.getRank(adminnedId, roles.metaAdmin.address)).to.be.revertedWith(
            'adminnedId not zero'
          )
        );
      });
    });
  });
  context("metaAdmin's rank is not being queried", function () {
    context('Admin ranks are queried for the zero ID', function () {
      it('returns regular rank', async function () {
        expect(
          await api3RequesterRrpAuthorizer.getRank(hre.ethers.constants.HashZero, roles.superAdmin.address)
        ).to.be.equal(AdminRank.SuperAdmin);
        expect(
          await api3RequesterRrpAuthorizer.getRank(hre.ethers.constants.HashZero, roles.admin.address)
        ).to.be.equal(AdminRank.Admin);
        expect(
          await api3RequesterRrpAuthorizer.getRank(hre.ethers.constants.HashZero, roles.randomPerson.address)
        ).to.be.equal(AdminRank.Unauthorized);
      });
      context('Admin ranks are querired for the non zero ID', function () {
        it('reverts', async function () {
          await expect(api3RequesterRrpAuthorizer.getRank(adminnedId, roles.superAdmin.address)).to.be.revertedWith(
            'adminnedId not zero'
          );
          await expect(api3RequesterRrpAuthorizer.getRank(adminnedId, roles.admin.address)).to.be.revertedWith(
            'adminnedId not zero'
          );
          await expect(api3RequesterRrpAuthorizer.getRank(adminnedId, roles.randomPerson.address)).to.be.revertedWith(
            'adminnedId not zero'
          );
        });
      });
    });
  });
});

describe('setRank', function () {
  context('Admin ranks are set for the zero ID', function () {
    context('Caller higher ranked than target admin', function () {
      context('Caller higher ranked than set rank', function () {
        it('sets rank for the adminned entity', async function () {
          await expect(
            api3RequesterRrpAuthorizer
              .connect(roles.superAdmin)
              .setRank(hre.ethers.constants.HashZero, roles.randomPerson.address, AdminRank.Admin)
          )
            .to.emit(api3RequesterRrpAuthorizer, 'SetRank')
            .withArgs(
              hre.ethers.constants.HashZero,
              roles.randomPerson.address,
              AdminRank.Admin,
              roles.superAdmin.address
            );
          expect(
            await api3RequesterRrpAuthorizer.getRank(hre.ethers.constants.HashZero, roles.randomPerson.address)
          ).to.be.equal(AdminRank.Admin);
        });
      });
      context('Caller not higher ranked than set rank', function () {
        it('reverts', async function () {
          await expect(
            api3RequesterRrpAuthorizer
              .connect(roles.admin)
              .setRank(hre.ethers.constants.HashZero, roles.randomPerson.address, AdminRank.Admin)
          ).to.be.revertedWith('Caller ranked low');
        });
      });
    });
    context('Caller not higher ranked than target admin', function () {
      it('reverts', async function () {
        await expect(
          api3RequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setRank(hre.ethers.constants.HashZero, roles.anotherSuperAdmin.address, AdminRank.Admin)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });

  context('Admin ranks are set for non-zero ID', function () {
    it('reverts', async function () {
      await expect(
        api3RequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setRank(adminnedId, roles.randomPerson.address, AdminRank.Admin)
      ).to.be.revertedWith('adminnedId not zero');
    });
  });
});

describe('decreaseSelfRank', function () {
  context('Admin ranks are set for the zero ID', function () {
    context('Caller higher ranked than target rank', function () {
      it("decreases caller's rank", async function () {
        await expect(
          api3RequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .decreaseSelfRank(hre.ethers.constants.HashZero, AdminRank.Admin)
        )
          .to.emit(api3RequesterRrpAuthorizer, 'DecreasedSelfRank')
          .withArgs(hre.ethers.constants.HashZero, roles.superAdmin.address, AdminRank.Admin);
        expect(
          await api3RequesterRrpAuthorizer.getRank(hre.ethers.constants.HashZero, roles.superAdmin.address)
        ).to.be.equal(AdminRank.Admin);
        await expect(
          api3RequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .decreaseSelfRank(hre.ethers.constants.HashZero, AdminRank.Unauthorized)
        )
          .to.emit(api3RequesterRrpAuthorizer, 'DecreasedSelfRank')
          .withArgs(hre.ethers.constants.HashZero, roles.superAdmin.address, AdminRank.Unauthorized);
        expect(
          await api3RequesterRrpAuthorizer.getRank(hre.ethers.constants.HashZero, roles.superAdmin.address)
        ).to.be.equal(AdminRank.Unauthorized);
        await expect(
          api3RequesterRrpAuthorizer
            .connect(roles.admin)
            .decreaseSelfRank(hre.ethers.constants.HashZero, AdminRank.Unauthorized)
        )
          .to.emit(api3RequesterRrpAuthorizer, 'DecreasedSelfRank')
          .withArgs(hre.ethers.constants.HashZero, roles.admin.address, AdminRank.Unauthorized);
        expect(
          await api3RequesterRrpAuthorizer.getRank(hre.ethers.constants.HashZero, roles.admin.address)
        ).to.be.equal(AdminRank.Unauthorized);
      });
    });
    context('Caller not higher ranked than target rank', function () {
      it('reverts', async function () {
        await expect(
          api3RequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .decreaseSelfRank(hre.ethers.constants.HashZero, AdminRank.SuperAdmin)
        ).to.be.revertedWith('Caller ranked low');
        await expect(
          api3RequesterRrpAuthorizer
            .connect(roles.admin)
            .decreaseSelfRank(hre.ethers.constants.HashZero, AdminRank.SuperAdmin)
        ).to.be.revertedWith('Caller ranked low');
        await expect(
          api3RequesterRrpAuthorizer
            .connect(roles.admin)
            .decreaseSelfRank(hre.ethers.constants.HashZero, AdminRank.Admin)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
  context('Admin ranks are set for non zero ID', function () {
    it('reverts', async function () {
      await expect(
        api3RequesterRrpAuthorizer.connect(roles.superAdmin).decreaseSelfRank(adminnedId, AdminRank.Admin)
      ).to.be.revertedWith('adminnedId not zero');
    });
  });
});
