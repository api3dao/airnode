const { expect } = require('chai');

const AdminStatus = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
};

let roles;
let api3Adminship;
// const airnodeId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
// const requesterIndex = 123;
// const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
// const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

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
  const api3AdminshipFactory = await ethers.getContractFactory('Api3Adminship', roles.deployer);
  api3Adminship = await api3AdminshipFactory.deploy(roles.metaAdmin.address);
});

describe('constructor', function () {
  context('Meta admin address is non-zero', function () {
    it('initializes correctly', async function () {
      expect(await api3Adminship.metaAdmin()).to.equal(roles.metaAdmin.address);
    });
  });
  context('Meta admin address is zero', function () {
    it('reverts', async function () {
      const api3AdminshipFactory = await ethers.getContractFactory('Api3Adminship', roles.deployer);
      await expect(api3AdminshipFactory.deploy(ethers.constants.AddressZero)).to.be.revertedWith('Zero address');
    });
  });
});

describe('setMetaAdmin', function () {
  context('Caller is the meta admin', async function () {
    context('Address to be set as meta admin is non-zero', async function () {
      it('transfers master adminship', async function () {
        await expect(api3Adminship.connect(roles.metaAdmin).setMetaAdmin(roles.newMetaAdmin.address))
          .to.emit(api3Adminship, 'SetMetaAdmin')
          .withArgs(roles.newMetaAdmin.address);
      });
    });
    context('Address to be set as meta admin is non-zero', async function () {
      it('reverts', async function () {
        await expect(
          api3Adminship.connect(roles.metaAdmin).setMetaAdmin(ethers.constants.AddressZero)
        ).to.be.revertedWith('Zero address');
      });
    });
  });
  context('Caller is not the meta admin', async function () {
    it('reverts', async function () {
      await expect(
        api3Adminship.connect(roles.randomPerson).setMetaAdmin(roles.newMetaAdmin.address)
      ).to.be.revertedWith('Unauthorized');
    });
  });
});

describe('setAdminStatus', function () {
  context('Caller is the meta admin', async function () {
    it('sets admin status', async function () {
      // Give admin status
      await expect(api3Adminship.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Admin))
        .to.emit(api3Adminship, 'SetAdminStatus')
        .withArgs(roles.admin.address, AdminStatus.Admin);
      expect(await api3Adminship.adminStatuses(roles.admin.address)).to.equal(AdminStatus.Admin);
      // Revoke admin status
      await expect(api3Adminship.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Unauthorized))
        .to.emit(api3Adminship, 'SetAdminStatus')
        .withArgs(roles.admin.address, AdminStatus.Unauthorized);
      expect(await api3Adminship.adminStatuses(roles.admin.address)).to.equal(AdminStatus.Unauthorized);
    });
    it('sets super admin status', async function () {
      // Give super admin status
      await expect(
        api3Adminship.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin)
      )
        .to.emit(api3Adminship, 'SetAdminStatus')
        .withArgs(roles.superAdmin.address, AdminStatus.SuperAdmin);
      expect(await api3Adminship.adminStatuses(roles.superAdmin.address)).to.equal(AdminStatus.SuperAdmin);
      // Revoke super admin status
      await expect(
        api3Adminship.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.Unauthorized)
      )
        .to.emit(api3Adminship, 'SetAdminStatus')
        .withArgs(roles.superAdmin.address, AdminStatus.Unauthorized);
      expect(await api3Adminship.adminStatuses(roles.superAdmin.address)).to.equal(AdminStatus.Unauthorized);
    });
  });
  context('Caller is not the meta admin', async function () {
    it('reverts', async function () {
      await expect(
        api3Adminship.connect(roles.randomPerson).setAdminStatus(roles.admin.address, AdminStatus.Admin)
      ).to.be.revertedWith('Unauthorized');
      await expect(
        api3Adminship.connect(roles.randomPerson).setAdminStatus(roles.admin.address, AdminStatus.SuperAdmin)
      ).to.be.revertedWith('Unauthorized');
    });
  });
});

describe('renounceAdminStatus', function () {
  context('Caller is an admin', async function () {
    it('renounces admin status', async function () {
      await api3Adminship.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Admin);
      await expect(api3Adminship.connect(roles.admin).renounceAdminStatus())
        .to.emit(api3Adminship, 'RenouncedAdminStatus')
        .withArgs(roles.admin.address);
      expect(await api3Adminship.adminStatuses(roles.admin.address)).to.equal(AdminStatus.Unauthorized);
    });
  });
  context('Caller is a super admin', async function () {
    it('renounces admin status', async function () {
      await api3Adminship.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin);
      await expect(api3Adminship.connect(roles.superAdmin).renounceAdminStatus())
        .to.emit(api3Adminship, 'RenouncedAdminStatus')
        .withArgs(roles.superAdmin.address);
      expect(await api3Adminship.adminStatuses(roles.superAdmin.address)).to.equal(AdminStatus.Unauthorized);
    });
  });
  context('Caller is not an admin', async function () {
    it('reverts', async function () {
      await expect(api3Adminship.connect(roles.randomPerson).renounceAdminStatus()).to.be.revertedWith('Unauthorized');
    });
  });
});
