/* globals context ethers */

const { expect } = require('chai');

let roles;
let api3ClientRrpAuthorizer;

const api3AdminnedEntity = ethers.constants.HashZero;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    superAdmin: accounts[2],
    admin: accounts[3],
    client: accounts[4],
    randomPerson: accounts[9],
  };
  const api3ClientRrpAuthorizerFactory = await ethers.getContractFactory('Api3ClientRrpAuthorizer', roles.deployer);
  api3ClientRrpAuthorizer = await api3ClientRrpAuthorizerFactory.deploy(roles.metaAdmin.address);
});

describe('constructor', function () {
  context('Meta admin address is non-zero', function () {
    it('initializes correctly', async function () {
      expect(await api3ClientRrpAuthorizer.AUTHORIZER_TYPE()).to.equal(2);
      expect(await api3ClientRrpAuthorizer.metaAdmin()).to.equal(roles.metaAdmin.address);
    });
  });
  context('Meta admin address is zero', function () {
    it('reverts', async function () {
      const api3ClientRrpAuthorizerFactory = await ethers.getContractFactory('Api3ClientRrpAuthorizer', roles.deployer);
      await expect(api3ClientRrpAuthorizerFactory.deploy(ethers.constants.AddressZero)).to.be.revertedWith(
        'Zero address'
      );
    });
  });
});

describe('getRank', function () {
  context('Caller is the metaAdmin', function () {
    it('returns MAX_RANK', async function () {
      expect(
        await api3ClientRrpAuthorizer.connect(roles.metaAdmin).getRank(api3AdminnedEntity, roles.metaAdmin.address)
      ).to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
      expect(
        await api3ClientRrpAuthorizer.connect(roles.metaAdmin).getRank(api3AdminnedEntity, roles.admin.address)
      ).to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
      expect(
        await api3ClientRrpAuthorizer.connect(roles.metaAdmin).getRank(api3AdminnedEntity, roles.randomPerson.address)
      ).to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
    });
  });

  context('Caller is the deployer', function () {
    it('returns zero if admin rank has not been set', async function () {
      expect(
        await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.metaAdmin.address)
      ).to.equal(0);
      expect(
        await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.admin.address)
      ).to.equal(0);
      expect(
        await api3ClientRrpAuthorizer.connect(roles.deployer).getRank(api3AdminnedEntity, roles.randomPerson.address)
      ).to.equal(0);
    });
  });
});
