/* globals context ethers */

const { expect } = require('chai');

let roles;
let selfClientRrpAuthorizer;
let airnodeRrp;
let airnodeId;

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
