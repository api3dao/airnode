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

describe('constructor', function () {
  context('metaAdmin_ is not zero', function () {
    it('constructs', async function () {
      const metaAdminnableFactory = await hre.ethers.getContractFactory('MetaAdminnable', roles.deployer);
      const anotherMetaAdminnable = await metaAdminnableFactory.deploy(roles.metaAdmin.address);
      expect(await anotherMetaAdminnable.metaAdmin()).to.equal(roles.metaAdmin.address);
    });
  });
  context('metaAdmin_ is zero', function () {
    it('reverts', async function () {
      const metaAdminnableFactory = await hre.ethers.getContractFactory('MetaAdminnable', roles.deployer);
      await expect(metaAdminnableFactory.deploy(hre.ethers.constants.AddressZero)).to.be.revertedWith('Zero address');
    });
  });
});

describe('transferMetaAdminStatus', function () {
  context('caller is metaAdmin', function () {
    context('New metaAdmin is not zero', function () {
      it('transfers metaAdmins status', async function () {
        await expect(metaAdminnable.connect(roles.metaAdmin).transferMetaAdminStatus(roles.randomPerson.address))
          .to.emit(metaAdminnable, 'TransferredMetaAdminStatus')
          .withArgs(roles.randomPerson.address);
        expect(await metaAdminnable.metaAdmin()).to.equal(roles.randomPerson.address);
      });
    });
    context('New metaAdmin is zero', function () {
      it('reverts', async function () {
        await expect(
          metaAdminnable.connect(roles.metaAdmin).transferMetaAdminStatus(hre.ethers.constants.AddressZero)
        ).to.be.revertedWith('Zero address');
      });
    });
  });
  context('caller is not metaAdmin', function () {
    it('reverts', async function () {
      await expect(
        metaAdminnable.connect(roles.randomPerson).transferMetaAdminStatus(roles.randomPerson.address)
      ).to.be.revertedWith('Caller not metaAdmin');
    });
  });
});

describe('getRank', function () {
  context("metaAdmin's rank is being queried", function () {
    it('returns highest possible rank', async function () {
      expect(await metaAdminnable.getRank(adminnedId, roles.metaAdmin.address)).to.be.equal(AdminRank.MetaAdmin);
      expect(await metaAdminnable.getRank(anotherId, roles.metaAdmin.address)).to.be.equal(AdminRank.MetaAdmin);
    });
  });
  context("metaAdmin's rank is not being queried", function () {
    it('returns regular rank', async function () {
      expect(await metaAdminnable.getRank(adminnedId, roles.superAdmin.address)).to.be.equal(AdminRank.SuperAdmin);
      expect(await metaAdminnable.getRank(adminnedId, roles.admin.address)).to.be.equal(AdminRank.Admin);
      expect(await metaAdminnable.getRank(adminnedId, roles.randomPerson.address)).to.be.equal(AdminRank.Unauthorized);
      expect(await metaAdminnable.getRank(anotherId, roles.superAdmin.address)).to.be.equal(AdminRank.Unauthorized);
      expect(await metaAdminnable.getRank(anotherId, roles.admin.address)).to.be.equal(AdminRank.Unauthorized);
      expect(await metaAdminnable.getRank(anotherId, roles.randomPerson.address)).to.be.equal(AdminRank.Unauthorized);
    });
  });
});
