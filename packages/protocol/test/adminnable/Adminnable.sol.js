/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

const AdminRank = Object.freeze({
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
});

let roles;
let adminnable;

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
  const adminnableFactory = await hre.ethers.getContractFactory('Adminnable', roles.deployer);
  adminnable = await adminnableFactory.deploy();
  await adminnable.connect(roles.deployer).transferMetaAdminStatus(roles.metaAdmin.address);
  await adminnable.connect(roles.metaAdmin).setRank(roles.admin.address, AdminRank.Admin);
  await adminnable.connect(roles.metaAdmin).setRank(roles.superAdmin.address, AdminRank.SuperAdmin);
  await adminnable.connect(roles.metaAdmin).setRank(roles.anotherSuperAdmin.address, AdminRank.SuperAdmin);
});

describe('constructor', function () {
  it('sets the deployer as the meta-admin', async function () {
    const adminnableFactory = await hre.ethers.getContractFactory('Adminnable', roles.deployer);
    adminnable = await adminnableFactory.deploy();
    expect(await adminnable.metaAdmin()).to.equal(roles.deployer.address);
  });
});

describe('transferMetaAdminStatus', function () {
  context('caller is metaAdmin', function () {
    context('New metaAdmin is not zero', function () {
      it('transfers metaAdmin status', async function () {
        await expect(adminnable.connect(roles.metaAdmin).transferMetaAdminStatus(roles.randomPerson.address))
          .to.emit(adminnable, 'TransferredMetaAdminStatus')
          .withArgs(roles.randomPerson.address);
        expect(await adminnable.metaAdmin()).to.equal(roles.randomPerson.address);
      });
    });
    context('New metaAdmin is zero', function () {
      it('reverts', async function () {
        await expect(
          adminnable.connect(roles.metaAdmin).transferMetaAdminStatus(hre.ethers.constants.AddressZero)
        ).to.be.revertedWith('Zero address');
      });
    });
  });
  context('Caller is not metaAdmin', function () {
    it('reverts', async function () {
      await expect(
        adminnable.connect(roles.randomPerson).transferMetaAdminStatus(roles.randomPerson.address)
      ).to.be.revertedWith('Caller not metaAdmin');
    });
  });
});

describe('setRank', function () {
  context('Caller higher ranked than target admin', function () {
    context('Caller higher ranked than set rank', function () {
      context('Target admin is not zero', function () {
        it('sets rank', async function () {
          await expect(adminnable.connect(roles.superAdmin).setRank(roles.randomPerson.address, AdminRank.Admin))
            .to.emit(adminnable, 'SetRank')
            .withArgs(roles.superAdmin.address, roles.randomPerson.address, AdminRank.Admin);
          expect(await adminnable.adminToRank(roles.randomPerson.address)).to.be.equal(AdminRank.Admin);
          await expect(adminnable.connect(roles.metaAdmin).setRank(roles.randomPerson.address, AdminRank.SuperAdmin))
            .to.emit(adminnable, 'SetRank')
            .withArgs(roles.metaAdmin.address, roles.randomPerson.address, AdminRank.SuperAdmin);
          expect(await adminnable.adminToRank(roles.randomPerson.address)).to.be.equal(AdminRank.SuperAdmin);
        });
      });
      context('Target admin is zero', function () {
        it('reverts', async function () {
          await expect(
            adminnable.connect(roles.superAdmin).setRank(hre.ethers.constants.AddressZero, AdminRank.Admin)
          ).to.be.revertedWith('Target admin zero');
        });
      });
    });
    context('Caller not higher ranked than set rank', function () {
      it('reverts', async function () {
        await expect(
          adminnable.connect(roles.admin).setRank(roles.randomPerson.address, AdminRank.Admin)
        ).to.be.revertedWith('Caller ranked low');
        await expect(
          adminnable.connect(roles.superAdmin).setRank(roles.randomPerson.address, AdminRank.SuperAdmin)
        ).to.be.revertedWith('Caller ranked low');
      });
    });
  });
  context('Caller not higher ranked than target admin', function () {
    it('reverts', async function () {
      await expect(
        adminnable.connect(roles.superAdmin).setRank(roles.anotherSuperAdmin.address, AdminRank.Admin)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('decreaseSelfRank', function () {
  context('Caller higher ranked than target rank', function () {
    it("decreases caller's rank", async function () {
      await expect(adminnable.connect(roles.superAdmin).decreaseSelfRank(AdminRank.Admin))
        .to.emit(adminnable, 'DecreasedSelfRank')
        .withArgs(roles.superAdmin.address, AdminRank.Admin);
      expect(await adminnable.adminToRank(roles.superAdmin.address)).to.be.equal(AdminRank.Admin);
      await expect(adminnable.connect(roles.superAdmin).decreaseSelfRank(AdminRank.Unauthorized))
        .to.emit(adminnable, 'DecreasedSelfRank')
        .withArgs(roles.superAdmin.address, AdminRank.Unauthorized);
      expect(await adminnable.adminToRank(roles.superAdmin.address)).to.be.equal(AdminRank.Unauthorized);
      await expect(adminnable.connect(roles.admin).decreaseSelfRank(AdminRank.Unauthorized))
        .to.emit(adminnable, 'DecreasedSelfRank')
        .withArgs(roles.admin.address, AdminRank.Unauthorized);
      expect(await adminnable.adminToRank(roles.admin.address)).to.be.equal(AdminRank.Unauthorized);
    });
  });
  context('Caller not higher ranked than target rank', function () {
    it('reverts', async function () {
      await expect(adminnable.connect(roles.superAdmin).decreaseSelfRank(AdminRank.SuperAdmin)).to.be.revertedWith(
        'Caller ranked low'
      );
      await expect(adminnable.connect(roles.admin).decreaseSelfRank(AdminRank.SuperAdmin)).to.be.revertedWith(
        'Caller ranked low'
      );
      await expect(adminnable.connect(roles.admin).decreaseSelfRank(AdminRank.Admin)).to.be.revertedWith(
        'Caller ranked low'
      );
    });
  });
});
