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
let selfRequesterRrpAuthorizer;
let airnodeAddress, airnodeMnemonic, airnodeId;
let anotherId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    admin: accounts[2],
    superAdmin: accounts[3],
    randomPerson: accounts[9],
  };
  const selfRequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
    'SelfRequesterRrpAuthorizer',
    roles.deployer
  );
  selfRequesterRrpAuthorizer = await selfRequesterRrpAuthorizerFactory.deploy();
  ({ airnodeAddress: airnodeAddress, airnodeMnemonic: airnodeMnemonic } = utils.generateRandomAirnodeWallet());
  airnodeId = hre.ethers.utils.defaultAbiCoder.encode(['address'], [airnodeAddress]);
  anotherId = utils.generateRandomBytes32();
  await roles.deployer.sendTransaction({
    to: airnodeAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
  const airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);
  await selfRequesterRrpAuthorizer
    .connect(airnodeWallet)
    .setRank(airnodeId, roles.admin.address, AdminRank.Admin, { gasLimit: 500000 });
  await selfRequesterRrpAuthorizer
    .connect(airnodeWallet)
    .setRank(airnodeId, roles.superAdmin.address, AdminRank.SuperAdmin, { gasLimit: 500000 });
});

describe('constructor', function () {
  it('users correct AUTHORIZER_TYPE', async function () {
    expect(await selfRequesterRrpAuthorizer.AUTHORIZER_TYPE()).to.equal(1);
  });
});

describe('getRank', function () {
  context('Rank of the Airnode address is being queried for the respective Airnode', function () {
    it('returns highest possible rank', async function () {
      expect(await selfRequesterRrpAuthorizer.getRank(airnodeId, airnodeAddress)).to.equal(AdminRank.MetaAdmin);
    });
  });
  context('Rank of the Airnode address is not being queried for the respective Airnode', function () {
    it('returns regular rank', async function () {
      expect(await selfRequesterRrpAuthorizer.getRank(airnodeId, roles.superAdmin.address)).to.be.equal(
        AdminRank.SuperAdmin
      );
      expect(await selfRequesterRrpAuthorizer.getRank(airnodeId, roles.admin.address)).to.be.equal(AdminRank.Admin);
      expect(await selfRequesterRrpAuthorizer.getRank(airnodeId, roles.randomPerson.address)).to.be.equal(
        AdminRank.Unauthorized
      );
      expect(await selfRequesterRrpAuthorizer.getRank(anotherId, airnodeAddress)).to.be.equal(AdminRank.Unauthorized);
      expect(await selfRequesterRrpAuthorizer.getRank(anotherId, roles.superAdmin.address)).to.be.equal(
        AdminRank.Unauthorized
      );
      expect(await selfRequesterRrpAuthorizer.getRank(anotherId, roles.admin.address)).to.be.equal(
        AdminRank.Unauthorized
      );
      expect(await selfRequesterRrpAuthorizer.getRank(anotherId, roles.randomPerson.address)).to.be.equal(
        AdminRank.Unauthorized
      );
    });
  });
});
