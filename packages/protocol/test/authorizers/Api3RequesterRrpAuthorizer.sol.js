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
let adminnedId, anotherId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    admin: accounts[2],
    superAdmin: accounts[3],
    user: accounts[4],
    randomPerson: accounts[9],
  };
  const api3RequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
    'Api3RequesterRrpAuthorizer',
    roles.deployer
  );
  api3RequesterRrpAuthorizer = await api3RequesterRrpAuthorizerFactory.deploy(roles.metaAdmin.address);
  adminnedId = utils.generateRandomBytes32();
  anotherId = utils.generateRandomBytes32();
  await api3RequesterRrpAuthorizer.connect(roles.metaAdmin).setRank(adminnedId, roles.admin.address, AdminRank.Admin);
  await api3RequesterRrpAuthorizer
    .connect(roles.metaAdmin)
    .setRank(adminnedId, roles.superAdmin.address, AdminRank.SuperAdmin);
});

describe('constructor', function () {
  it('users correct AUTHORIZER_TYPE', async function () {
    expect(await api3RequesterRrpAuthorizer.AUTHORIZER_TYPE()).to.equal(2);
  });
});

describe('getRank', function () {
  context("metaAdmin's rank is being queried", function () {
    it('returns highest possible rank', async function () {
      expect(await api3RequesterRrpAuthorizer.getRank(adminnedId, roles.metaAdmin.address)).to.be.equal(
        AdminRank.MetaAdmin
      );
      expect(await api3RequesterRrpAuthorizer.getRank(anotherId, roles.metaAdmin.address)).to.be.equal(
        AdminRank.MetaAdmin
      );
    });
  });
  context("metaAdmin's rank is not being queried", function () {
    it('returns regular rank', async function () {
      expect(await api3RequesterRrpAuthorizer.getRank(adminnedId, roles.superAdmin.address)).to.be.equal(
        AdminRank.SuperAdmin
      );
      expect(await api3RequesterRrpAuthorizer.getRank(adminnedId, roles.admin.address)).to.be.equal(AdminRank.Admin);
      expect(await api3RequesterRrpAuthorizer.getRank(adminnedId, roles.randomPerson.address)).to.be.equal(
        AdminRank.Unauthorized
      );
      expect(await api3RequesterRrpAuthorizer.getRank(anotherId, roles.superAdmin.address)).to.be.equal(
        AdminRank.Unauthorized
      );
      expect(await api3RequesterRrpAuthorizer.getRank(anotherId, roles.admin.address)).to.be.equal(
        AdminRank.Unauthorized
      );
      expect(await api3RequesterRrpAuthorizer.getRank(anotherId, roles.randomPerson.address)).to.be.equal(
        AdminRank.Unauthorized
      );
    });
  });
});
