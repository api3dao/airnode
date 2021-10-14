/* globals context */

const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../utils');

const AdminRank = Object.freeze({
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
});

let roles;
let daoRequesterRrpAuthorizer;
let airnodeAddress = utils.generateRandomAddress();
let endpointId = utils.generateRandomBytes32();

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    admin: accounts[2],
    superAdmin: accounts[3],
    requester: accounts[4],
    randomPerson: accounts[9],
  };
  const daoRequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
    'DaoRequesterRrpAuthorizer',
    roles.deployer
  );
  daoRequesterRrpAuthorizer = await daoRequesterRrpAuthorizerFactory.deploy();
  await daoRequesterRrpAuthorizer.connect(roles.deployer).transferMetaAdminStatus(roles.metaAdmin.address);
  await daoRequesterRrpAuthorizer.connect(roles.metaAdmin).setRank(roles.admin.address, AdminRank.Admin);
  await daoRequesterRrpAuthorizer.connect(roles.metaAdmin).setRank(roles.superAdmin.address, AdminRank.SuperAdmin);
});

describe('constructor', function () {
  it('sets the deployer as the meta-admin', async function () {
    const daoRequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
      'DaoRequesterRrpAuthorizer',
      roles.deployer
    );
    daoRequesterRrpAuthorizer = await daoRequesterRrpAuthorizerFactory.deploy();
    expect(await daoRequesterRrpAuthorizer.metaAdmin()).to.equal(roles.deployer.address);
  });
  it('uses correct AUTHORIZER_TYPE', async function () {
    expect(await daoRequesterRrpAuthorizer.AUTHORIZER_TYPE()).to.equal(2);
  });
});

describe('extendWhitelistExpiration', function () {
  context('Caller of rank Admin', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      context('Airnode address not zero', function () {
        it('extends whitelist expiration', async function () {
          let whitelistStatus;
          whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
          const expirationTimestamp = 1000;
          await expect(
            daoRequesterRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
          )
            .to.emit(daoRequesterRrpAuthorizer, 'ExtendedWhitelistExpiration')
            .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.admin.address, expirationTimestamp);
          whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(1000);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        });
      });
      context('Airnode address zero', function () {
        it('reverts', async function () {
          await expect(
            daoRequesterRrpAuthorizer
              .connect(roles.admin)
              .extendWhitelistExpiration(hre.ethers.constants.AddressZero, endpointId, roles.requester.address, 1000)
          ).to.be.revertedWith('Airnode address zero');
        });
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller of rank SuperAdmin', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      context('Airnode address not zero', function () {
        it('extends whitelist expiration', async function () {
          let whitelistStatus;
          whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
          const expirationTimestamp = 1000;
          await expect(
            daoRequesterRrpAuthorizer
              .connect(roles.superAdmin)
              .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
          )
            .to.emit(daoRequesterRrpAuthorizer, 'ExtendedWhitelistExpiration')
            .withArgs(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.superAdmin.address,
              expirationTimestamp
            );
          whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(1000);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        });
      });
      context('Airnode address zero', function () {
        it('reverts', async function () {
          await expect(
            daoRequesterRrpAuthorizer
              .connect(roles.superAdmin)
              .extendWhitelistExpiration(hre.ethers.constants.AddressZero, endpointId, roles.requester.address, 1000)
          ).to.be.revertedWith('Airnode address zero');
        });
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller meta-admin', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      context('Airnode address not zero', function () {
        it('extends whitelist expiration', async function () {
          let whitelistStatus;
          whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
          const expirationTimestamp = 1000;
          await expect(
            daoRequesterRrpAuthorizer
              .connect(roles.metaAdmin)
              .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
          )
            .to.emit(daoRequesterRrpAuthorizer, 'ExtendedWhitelistExpiration')
            .withArgs(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.metaAdmin.address,
              expirationTimestamp
            );
          whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(1000);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        });
      });
      context('Airnode address zero', function () {
        it('reverts', async function () {
          await expect(
            daoRequesterRrpAuthorizer
              .connect(roles.metaAdmin)
              .extendWhitelistExpiration(hre.ethers.constants.AddressZero, endpointId, roles.requester.address, 1000)
          ).to.be.revertedWith('Airnode address zero');
        });
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.metaAdmin)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller of rank lower than Admin', function () {
    it('reverts', async function () {
      await expect(
        daoRequesterRrpAuthorizer
          .connect(roles.randomPerson)
          .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('setWhitelistExpiration', function () {
  context('Caller of rank SuperAdmin', function () {
    context('Airnode address not zero', function () {
      it('sets whitelist expiration', async function () {
        let whitelistStatus;
        const expirationTimestamp = 1000;
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
        )
          .to.emit(daoRequesterRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.superAdmin.address, expirationTimestamp);
        whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        )
          .to.emit(daoRequesterRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.superAdmin.address, 0);
        whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Airnode address zero', function () {
      it('reverts', async function () {
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistExpiration(hre.ethers.constants.AddressZero, endpointId, roles.requester.address, 1000)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Caller meta-admin', function () {
    context('Airnode address not zero', function () {
      it('sets whitelist expiration', async function () {
        let whitelistStatus;
        const expirationTimestamp = 1000;
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
        )
          .to.emit(daoRequesterRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.metaAdmin.address, expirationTimestamp);
        whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        )
          .to.emit(daoRequesterRrpAuthorizer, 'SetWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.metaAdmin.address, 0);
        whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Airnode address zero', function () {
      it('reverts', async function () {
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistExpiration(hre.ethers.constants.AddressZero, endpointId, roles.requester.address, 1000)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Caller of rank lower than SuperAdmin', function () {
    it('reverts', async function () {
      await expect(
        daoRequesterRrpAuthorizer
          .connect(roles.admin)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        daoRequesterRrpAuthorizer
          .connect(roles.randomPerson)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('setWhitelistStatusPastExpiration', function () {
  context('Caller of rank SuperAdmin', function () {
    context('Airnode address not zero', function () {
      it('sets whitelist status past expiration', async function () {
        let whitelistStatus;
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, true)
        )
          .to.emit(daoRequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.superAdmin.address, true);
        whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, false)
        )
          .to.emit(daoRequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.superAdmin.address, false);
        whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Airnode address zero', function () {
      it('reverts', async function () {
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(
              hre.ethers.constants.AddressZero,
              endpointId,
              roles.requester.address,
              true
            )
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Caller meta-admin', function () {
    context('Airnode address not zero', function () {
      it('sets whitelist status past expiration', async function () {
        let whitelistStatus;
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, true)
        )
          .to.emit(daoRequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.metaAdmin.address, true);
        whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, false)
        )
          .to.emit(daoRequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.metaAdmin.address, false);
        whitelistStatus = await daoRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Airnode address zero', function () {
      it('reverts', async function () {
        await expect(
          daoRequesterRrpAuthorizer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(
              hre.ethers.constants.AddressZero,
              endpointId,
              roles.requester.address,
              true
            )
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Caller of rank lower than SuperAdmin', function () {
    it('reverts', async function () {
      await expect(
        daoRequesterRrpAuthorizer
          .connect(roles.admin)
          .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, true)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        daoRequesterRrpAuthorizer
          .connect(roles.randomPerson)
          .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, true)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('isAuthorized', function () {
  context('Airnode address not zero', function () {
    context('Requester whitelisted', function () {
      context('Requester of rank Admin', function () {
        it('returns true', async function () {
          await daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.admin.address, true);
          expect(
            await daoRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.admin.address
            )
          ).to.equal(true);
        });
      });
      context('Requester of rank SuperAdmin', function () {
        it('returns true', async function () {
          await daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.superAdmin.address, true);
          expect(
            await daoRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.superAdmin.address
            )
          ).to.equal(true);
        });
      });
      context('Requester meta-admin', function () {
        it('returns true', async function () {
          await daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.metaAdmin.address, true);
          expect(
            await daoRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.metaAdmin.address
            )
          ).to.equal(true);
        });
      });
      context('Requester of rank lower than Admin', function () {
        it('returns true', async function () {
          await daoRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, true);
          expect(
            await daoRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.requester.address
            )
          ).to.equal(true);
        });
      });
    });
    context('Requester not whitelisted', function () {
      context('Requester of rank Admin', function () {
        it('returns true', async function () {
          expect(
            await daoRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.admin.address
            )
          ).to.equal(true);
        });
      });
      context('Requester of rank SuperAdmin', function () {
        it('returns true', async function () {
          expect(
            await daoRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.superAdmin.address
            )
          ).to.equal(true);
        });
      });
      context('Requester Airnode address', function () {
        it('returns true', async function () {
          expect(
            await daoRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.metaAdmin.address
            )
          ).to.equal(true);
        });
      });
      context('Requester of rank lower than Admin', function () {
        it('returns false', async function () {
          expect(
            await daoRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              roles.requester.address
            )
          ).to.equal(false);
        });
      });
    });
  });
  context('Airnode address zero', function () {
    it('reverts', async function () {
      await expect(
        daoRequesterRrpAuthorizer.isAuthorized(
          utils.generateRandomBytes32(),
          hre.ethers.constants.AddressZero,
          utils.generateRandomBytes32(),
          utils.generateRandomAddress(),
          roles.requester.address
        )
      ).to.be.revertedWith('Airnode address zero');
    });
  });
});
