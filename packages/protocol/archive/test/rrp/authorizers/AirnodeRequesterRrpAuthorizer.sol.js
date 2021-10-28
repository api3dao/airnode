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
let airnodeRequesterRrpAuthorizer;
let airnodeAddress, airnodeMnemonic, airnodeWallet;
let endpointId = utils.generateRandomBytes32();

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    admin: accounts[1],
    superAdmin: accounts[2],
    requester: accounts[3],
    randomPerson: accounts[9],
  };
  const airnodeRequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
    'AirnodeRequesterRrpAuthorizer',
    roles.deployer
  );
  airnodeRequesterRrpAuthorizer = await airnodeRequesterRrpAuthorizerFactory.deploy();
  ({ airnodeAddress: airnodeAddress, airnodeMnemonic: airnodeMnemonic } = utils.generateRandomAirnodeWallet());
  await roles.deployer.sendTransaction({
    to: airnodeAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);
  await airnodeRequesterRrpAuthorizer
    .connect(airnodeWallet)
    .setRank(airnodeAddress, roles.admin.address, AdminRank.Admin, { gasLimit: 500000 });
  await airnodeRequesterRrpAuthorizer
    .connect(airnodeWallet)
    .setRank(airnodeAddress, roles.superAdmin.address, AdminRank.SuperAdmin, { gasLimit: 500000 });
});

describe('extendWhitelistExpiration', function () {
  context('Caller of rank Admin', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      it('extends whitelist expiration', async function () {
        let whitelistStatus;
        whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        const expirationTimestamp = 1000;
        await expect(
          airnodeRequesterRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
        )
          .to.emit(airnodeRequesterRrpAuthorizer, 'ExtendedWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.admin.address, expirationTimestamp);
        whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(1000);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          airnodeRequesterRrpAuthorizer
            .connect(roles.admin)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller of rank SuperAdmin', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      it('extends whitelist expiration', async function () {
        let whitelistStatus;
        whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        const expirationTimestamp = 1000;
        await expect(
          airnodeRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
        )
          .to.emit(airnodeRequesterRrpAuthorizer, 'ExtendedWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.superAdmin.address, expirationTimestamp);
        whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(1000);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          airnodeRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller Airnode address', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      it('extends whitelist expiration', async function () {
        let whitelistStatus;
        whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        const expirationTimestamp = 1000;
        await expect(
          airnodeRequesterRrpAuthorizer
            .connect(airnodeWallet)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp, {
              gasLimit: 500000,
            })
        )
          .to.emit(airnodeRequesterRrpAuthorizer, 'ExtendedWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, expirationTimestamp);
        whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(1000);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          airnodeRequesterRrpAuthorizer
            .connect(airnodeWallet)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0, { gasLimit: 500000 })
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller of rank lower than Admin', function () {
    it('reverts', async function () {
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(roles.randomPerson)
          .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('setWhitelistExpiration', function () {
  context('Caller of rank SuperAdmin', function () {
    it('sets whitelist expiration', async function () {
      let whitelistStatus;
      const expirationTimestamp = 1000;
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
      )
        .to.emit(airnodeRequesterRrpAuthorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.superAdmin.address, expirationTimestamp);
      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
      )
        .to.emit(airnodeRequesterRrpAuthorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.superAdmin.address, 0);
      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
    });
  });
  context('Caller Airnode address', function () {
    it('sets whitelist expiration', async function () {
      let whitelistStatus;
      const expirationTimestamp = 1000;
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(airnodeWallet)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp, {
            gasLimit: 500000,
          })
      )
        .to.emit(airnodeRequesterRrpAuthorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, expirationTimestamp);
      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(airnodeWallet)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0, { gasLimit: 500000 })
      )
        .to.emit(airnodeRequesterRrpAuthorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, 0);
      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
    });
  });
  context('Caller of rank lower than SuperAdmin', function () {
    it('reverts', async function () {
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(roles.admin)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(roles.randomPerson)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('setWhitelistStatusPastExpiration', function () {
  context('Caller of rank SuperAdmin', function () {
    it('sets whitelist status past expiration', async function () {
      let whitelistStatus;
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, true)
      )
        .to.emit(airnodeRequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.superAdmin.address, true);
      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(roles.superAdmin)
          .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, false)
      )
        .to.emit(airnodeRequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.superAdmin.address, false);
      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
    });
  });
  context('Caller Airnode address', function () {
    it('sets whitelist status past expiration', async function () {
      let whitelistStatus;
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(airnodeWallet)
          .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, true, {
            gasLimit: 500000,
          })
      )
        .to.emit(airnodeRequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, true);
      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(airnodeWallet)
          .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, false, {
            gasLimit: 500000,
          })
      )
        .to.emit(airnodeRequesterRrpAuthorizer, 'SetWhitelistStatusPastExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, false);
      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
    });
  });
  context('Caller of rank lower than SuperAdmin', function () {
    it('reverts', async function () {
      await expect(
        airnodeRequesterRrpAuthorizer
          .connect(roles.admin)
          .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, true)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        airnodeRequesterRrpAuthorizer
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
          await airnodeRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.admin.address, true);
          expect(
            await airnodeRequesterRrpAuthorizer.isAuthorized(
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
          await airnodeRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.superAdmin.address, true);
          expect(
            await airnodeRequesterRrpAuthorizer.isAuthorized(
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
          await airnodeRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, airnodeAddress, true);
          expect(
            await airnodeRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              airnodeAddress
            )
          ).to.equal(true);
        });
      });
      context('Requester of rank lower than Admin', function () {
        it('returns true', async function () {
          await airnodeRequesterRrpAuthorizer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(airnodeAddress, endpointId, roles.requester.address, true);
          expect(
            await airnodeRequesterRrpAuthorizer.isAuthorized(
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
            await airnodeRequesterRrpAuthorizer.isAuthorized(
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
            await airnodeRequesterRrpAuthorizer.isAuthorized(
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
            await airnodeRequesterRrpAuthorizer.isAuthorized(
              utils.generateRandomBytes32(),
              airnodeAddress,
              endpointId,
              utils.generateRandomAddress(),
              airnodeAddress
            )
          ).to.equal(true);
        });
      });
      context('Requester of rank lower than Admin', function () {
        it('returns false', async function () {
          expect(
            await airnodeRequesterRrpAuthorizer.isAuthorized(
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
        airnodeRequesterRrpAuthorizer.isAuthorized(
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
