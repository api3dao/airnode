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
let metaAdminnable;
let adminnedId, anotherId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    admin: accounts[2],
    superAdmin: accounts[3],
    anotherSuperAdmin: accounts[4],
    randomPerson: accounts[9],
  };
  // We need to use MetaAdminnable to be able to seed the admin ranks
  const metaAdminnableFactory = await hre.ethers.getContractFactory('MetaAdminnable', roles.deployer);
  metaAdminnable = await metaAdminnableFactory.deploy(roles.metaAdmin.address);
  adminnedId = utils.generateRandomBytes32();
  anotherId = utils.generateRandomBytes32();
  await metaAdminnable.connect(roles.metaAdmin).setRank(adminnedId, roles.admin.address, AdminRank.Admin);
  await metaAdminnable.connect(roles.metaAdmin).setRank(adminnedId, roles.superAdmin.address, AdminRank.SuperAdmin);
  await metaAdminnable
    .connect(roles.metaAdmin)
    .setRank(adminnedId, roles.anotherSuperAdmin.address, AdminRank.SuperAdmin);
});

describe('setRank', function () {
  context('Caller higher ranked than target admin', function () {
    context('Caller higher ranked than set rank', function () {
      it('sets rank for the adminned entity', async function () {
        await expect(
          metaAdminnable.connect(roles.superAdmin).setRank(adminnedId, roles.randomPerson.address, AdminRank.Admin)
        )
          .to.emit(metaAdminnable, 'SetRank')
          .withArgs(adminnedId, roles.randomPerson.address, AdminRank.Admin, roles.superAdmin.address);
        expect(await metaAdminnable.getRank(adminnedId, roles.randomPerson.address)).to.be.equal(AdminRank.Admin);
      });
    });
    context('Caller not higher ranked than set rank', function () {
      it('reverts', async function () {
        await expect(
          metaAdminnable.connect(roles.admin).setRank(adminnedId, roles.randomPerson.address, AdminRank.Admin)
        ).to.be.revertedWith('Caller ranked low');
        // superAdmin is not authorized to set ranks for anotherId
        await expect(
          metaAdminnable.connect(roles.superAdmin).setRank(anotherId, roles.randomPerson.address, AdminRank.Admin)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
  context('Caller not higher ranked than target admin', function () {
    it('reverts', async function () {
      await expect(
        metaAdminnable.connect(roles.superAdmin).setRank(adminnedId, roles.anotherSuperAdmin.address, AdminRank.Admin)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('decreaseSelfRank', function () {
  context('Caller higher ranked than target rank', function () {
    it("decreases caller's rank", async function () {
      await expect(metaAdminnable.connect(roles.superAdmin).decreaseSelfRank(adminnedId, AdminRank.Admin))
        .to.emit(metaAdminnable, 'DecreasedSelfRank')
        .withArgs(adminnedId, roles.superAdmin.address, AdminRank.Admin);
      expect(await metaAdminnable.getRank(adminnedId, roles.superAdmin.address)).to.be.equal(AdminRank.Admin);
      await expect(metaAdminnable.connect(roles.superAdmin).decreaseSelfRank(adminnedId, AdminRank.Unauthorized))
        .to.emit(metaAdminnable, 'DecreasedSelfRank')
        .withArgs(adminnedId, roles.superAdmin.address, AdminRank.Unauthorized);
      expect(await metaAdminnable.getRank(adminnedId, roles.superAdmin.address)).to.be.equal(AdminRank.Unauthorized);
      await expect(metaAdminnable.connect(roles.admin).decreaseSelfRank(adminnedId, AdminRank.Unauthorized))
        .to.emit(metaAdminnable, 'DecreasedSelfRank')
        .withArgs(adminnedId, roles.admin.address, AdminRank.Unauthorized);
      expect(await metaAdminnable.getRank(adminnedId, roles.admin.address)).to.be.equal(AdminRank.Unauthorized);
    });
  });
  context('Caller not higher ranked than target rank', function () {
    it('reverts', async function () {
      await expect(
        metaAdminnable.connect(roles.superAdmin).decreaseSelfRank(adminnedId, AdminRank.SuperAdmin)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        metaAdminnable.connect(roles.admin).decreaseSelfRank(adminnedId, AdminRank.SuperAdmin)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        metaAdminnable.connect(roles.admin).decreaseSelfRank(adminnedId, AdminRank.Admin)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});
