/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

const AdminRank = Object.freeze({
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
});

let roles;
let selfAdminnable;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    adminned: accounts[1],
    admin: accounts[2],
    superAdmin: accounts[3],
    anotherSuperAdmin: accounts[4],
    randomPerson: accounts[9],
  };
  const selfAdminnableFactory = await hre.ethers.getContractFactory('SelfAdminnable', roles.deployer);
  selfAdminnable = await selfAdminnableFactory.deploy();
  await selfAdminnable.connect(roles.adminned).setRank(roles.adminned.address, roles.admin.address, AdminRank.Admin);
  await selfAdminnable
    .connect(roles.adminned)
    .setRank(roles.adminned.address, roles.superAdmin.address, AdminRank.SuperAdmin);
  await selfAdminnable
    .connect(roles.adminned)
    .setRank(roles.adminned.address, roles.anotherSuperAdmin.address, AdminRank.SuperAdmin);
});

describe('setRank', function () {
  context('Caller higher ranked than target admin', function () {
    context('Caller higher ranked than set rank', function () {
      it('sets rank', async function () {
        await expect(
          selfAdminnable
            .connect(roles.superAdmin)
            .setRank(roles.adminned.address, roles.randomPerson.address, AdminRank.Admin)
        )
          .to.emit(selfAdminnable, 'SetRank')
          .withArgs(roles.adminned.address, roles.superAdmin.address, roles.randomPerson.address, AdminRank.Admin);
        expect(
          await selfAdminnable.adminnedToAdminToRank(roles.adminned.address, roles.randomPerson.address)
        ).to.be.equal(AdminRank.Admin);
        await expect(
          selfAdminnable
            .connect(roles.adminned)
            .setRank(roles.adminned.address, roles.randomPerson.address, AdminRank.SuperAdmin)
        )
          .to.emit(selfAdminnable, 'SetRank')
          .withArgs(roles.adminned.address, roles.adminned.address, roles.randomPerson.address, AdminRank.SuperAdmin);
        expect(
          await selfAdminnable.adminnedToAdminToRank(roles.adminned.address, roles.randomPerson.address)
        ).to.be.equal(AdminRank.SuperAdmin);
      });
    });
    context('Caller not higher ranked than set rank', function () {
      it('reverts', async function () {
        await expect(
          selfAdminnable
            .connect(roles.admin)
            .setRank(roles.adminned.address, roles.randomPerson.address, AdminRank.Admin)
        ).to.be.revertedWith('Caller ranked low');
        await expect(
          selfAdminnable
            .connect(roles.superAdmin)
            .setRank(roles.adminned.address, roles.randomPerson.address, AdminRank.SuperAdmin)
        ).to.be.revertedWith('Caller ranked low');
        await expect(
          selfAdminnable
            .connect(roles.adminned)
            .setRank(roles.admin.address, roles.randomPerson.address, AdminRank.Admin)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
  context('Caller not higher ranked than target admin', function () {
    it('reverts', async function () {
      await expect(
        selfAdminnable
          .connect(roles.superAdmin)
          .setRank(roles.adminned.address, roles.anotherSuperAdmin.address, AdminRank.Admin)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('decreaseSelfRank', function () {
  context('Caller higher ranked than target rank', function () {
    it("decreases caller's rank", async function () {
      await expect(selfAdminnable.connect(roles.superAdmin).decreaseSelfRank(roles.adminned.address, AdminRank.Admin))
        .to.emit(selfAdminnable, 'DecreasedSelfRank')
        .withArgs(roles.adminned.address, roles.superAdmin.address, AdminRank.Admin);
      expect(await selfAdminnable.adminnedToAdminToRank(roles.adminned.address, roles.superAdmin.address)).to.be.equal(
        AdminRank.Admin
      );
      await expect(
        selfAdminnable.connect(roles.superAdmin).decreaseSelfRank(roles.adminned.address, AdminRank.Unauthorized)
      )
        .to.emit(selfAdminnable, 'DecreasedSelfRank')
        .withArgs(roles.adminned.address, roles.superAdmin.address, AdminRank.Unauthorized);
      expect(await selfAdminnable.adminnedToAdminToRank(roles.adminned.address, roles.superAdmin.address)).to.be.equal(
        AdminRank.Unauthorized
      );
      await expect(selfAdminnable.connect(roles.admin).decreaseSelfRank(roles.adminned.address, AdminRank.Unauthorized))
        .to.emit(selfAdminnable, 'DecreasedSelfRank')
        .withArgs(roles.adminned.address, roles.admin.address, AdminRank.Unauthorized);
      expect(await selfAdminnable.adminnedToAdminToRank(roles.adminned.address, roles.admin.address)).to.be.equal(
        AdminRank.Unauthorized
      );
    });
  });
  context('Caller not higher ranked than target rank', function () {
    it('reverts', async function () {
      await expect(
        selfAdminnable.connect(roles.superAdmin).decreaseSelfRank(roles.adminned.address, AdminRank.SuperAdmin)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        selfAdminnable.connect(roles.superAdmin).decreaseSelfRank(roles.randomPerson.address, AdminRank.Admin)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        selfAdminnable.connect(roles.superAdmin).decreaseSelfRank(roles.randomPerson.address, AdminRank.Unauthorized)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        selfAdminnable.connect(roles.admin).decreaseSelfRank(roles.adminned.address, AdminRank.SuperAdmin)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        selfAdminnable.connect(roles.admin).decreaseSelfRank(roles.adminned.address, AdminRank.Admin)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        selfAdminnable.connect(roles.admin).decreaseSelfRank(roles.randomPerson.address, AdminRank.Unauthorized)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});
