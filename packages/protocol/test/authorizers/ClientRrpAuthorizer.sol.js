/* globals context ethers */

const { expect } = require('chai');

const AdminRank = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
};

let roles;
let selfClientRrpAuthorizer;
let api3ClientRrpAuthorizer;
let airnodeRrp;
let airnodeId;
const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const api3AdminnedEntity = ethers.constants.HashZero;

// methods that are ovverriden are tested in their respective contracts

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    airnodeMasterWallet: accounts[1],
    admin: accounts[2],
    client: accounts[3],
    superAdmin: accounts[4],
    metaAdmin: accounts[5],
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

  const api3ClientRrpAuthorizerFactory = await ethers.getContractFactory('Api3ClientRrpAuthorizer', roles.deployer);
  api3ClientRrpAuthorizer = await api3ClientRrpAuthorizerFactory.deploy(roles.metaAdmin.address);
});

describe('isAuthorized', function () {
  context('SelfClientRrpAuthorizer', function () {
    context('Designated wallet balance is not zero', function () {
      context('Client is not Whitelisted', function () {
        context('Client whitelisting has not expired', function () {
          it('returns true', async function () {
            const designatedWallet = ethers.Wallet.createRandom();
            await roles.client.sendTransaction({
              to: designatedWallet.address,
              value: 1,
            });
            const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            const expiration = now + 100;
            await selfClientRrpAuthorizer
              .connect(roles.airnodeMasterWallet)
              .setRank(airnodeId, roles.admin.address, AdminRank.SuperAdmin);
            await selfClientRrpAuthorizer
              .connect(roles.admin)
              .setWhitelistExpiration(airnodeId, roles.client.address, expiration);
            expect(
              await selfClientRrpAuthorizer.isAuthorized(
                requestId,
                airnodeId,
                endpointId,
                roles.admin.address,
                designatedWallet.address,
                roles.client.address
              )
            ).to.equal(true);
          });
        });
        context('Client whitelisting has expired and whitelisting has not been set', function () {
          it('returns false', async function () {
            const designatedWallet = ethers.Wallet.createRandom();
            await roles.client.sendTransaction({
              to: designatedWallet.address,
              value: 1,
            });
            expect(
              await selfClientRrpAuthorizer.isAuthorized(
                requestId,
                airnodeId,
                endpointId,
                roles.admin.address,
                designatedWallet.address,
                roles.client.address
              )
            ).to.equal(false);
          });
        });
      });
      context('Client whitelisting was set then revoked', function () {
        it('returns false', async function () {
          const designatedWallet = ethers.Wallet.createRandom();
          await roles.client.sendTransaction({
            to: designatedWallet.address,
            value: 1,
          });
          await selfClientRrpAuthorizer
            .connect(roles.airnodeMasterWallet)
            .setRank(airnodeId, roles.admin.address, AdminRank.SuperAdmin);
          await selfClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, true);
          expect(
            await selfClientRrpAuthorizer.isAuthorized(
              requestId,
              airnodeId,
              endpointId,
              roles.admin.address,
              designatedWallet.address,
              roles.client.address
            )
          ).to.equal(true);
          await selfClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(airnodeId, roles.client.address, false);
          expect(
            await selfClientRrpAuthorizer.isAuthorized(
              requestId,
              airnodeId,
              endpointId,
              roles.admin.address,
              designatedWallet.address,
              roles.client.address
            )
          ).to.equal(false);
        });
      });
    });
    context('Designated wallet balance is zero', function () {
      it('returns false', async function () {
        const designatedWallet = ethers.Wallet.createRandom();
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        const expiration = now + 100;
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .setWhitelistExpiration(airnodeId, roles.client.address, expiration);
        expect(
          await selfClientRrpAuthorizer.isAuthorized(
            requestId,
            airnodeId,
            endpointId,
            roles.airnodeMasterWallet.address,
            designatedWallet.address,
            roles.client.address
          )
        ).to.equal(false);
      });
    });
  });
  context('Api3ClientRrpAuthorizer', function () {
    context('Designated wallet balance is not zero', function () {
      context('Client is not Whitelisted', function () {
        context('Client whitelisting has not expired', function () {
          it('returns true', async function () {
            const designatedWallet = ethers.Wallet.createRandom();
            await roles.client.sendTransaction({
              to: designatedWallet.address,
              value: 1,
            });
            const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            const expiration = now + 100;
            await api3ClientRrpAuthorizer
              .connect(roles.metaAdmin)
              .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.SuperAdmin);
            await api3ClientRrpAuthorizer
              .connect(roles.admin)
              .setWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration);
            expect(
              await api3ClientRrpAuthorizer.isAuthorized(
                requestId,
                api3AdminnedEntity,
                endpointId,
                roles.admin.address,
                designatedWallet.address,
                roles.client.address
              )
            ).to.equal(true);
          });
        });
        context('Client whitelisting has expired and whitelisting has not been set', function () {
          it('returns false', async function () {
            const designatedWallet = ethers.Wallet.createRandom();
            await roles.client.sendTransaction({
              to: designatedWallet.address,
              value: 1,
            });
            expect(
              await api3ClientRrpAuthorizer.isAuthorized(
                requestId,
                api3AdminnedEntity,
                endpointId,
                roles.admin.address,
                designatedWallet.address,
                roles.client.address
              )
            ).to.equal(false);
          });
        });
      });
      context('Client whitelisting was set then revoked', function () {
        it('returns false', async function () {
          const designatedWallet = ethers.Wallet.createRandom();
          await roles.client.sendTransaction({
            to: designatedWallet.address,
            value: 1,
          });
          await api3ClientRrpAuthorizer
            .connect(roles.metaAdmin)
            .setRank(api3AdminnedEntity, roles.admin.address, AdminRank.SuperAdmin);
          await api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(api3AdminnedEntity, roles.client.address, true);
          expect(
            await api3ClientRrpAuthorizer.isAuthorized(
              requestId,
              api3AdminnedEntity,
              endpointId,
              roles.admin.address,
              designatedWallet.address,
              roles.client.address
            )
          ).to.equal(true);
          await api3ClientRrpAuthorizer
            .connect(roles.admin)
            .setWhitelistStatusPastExpiration(api3AdminnedEntity, roles.client.address, false);
          expect(
            await api3ClientRrpAuthorizer.isAuthorized(
              requestId,
              api3AdminnedEntity,
              endpointId,
              roles.admin.address,
              designatedWallet.address,
              roles.client.address
            )
          ).to.equal(false);
        });
      });
    });
    context('Designated wallet balance is zero', function () {
      it('returns false', async function () {
        const designatedWallet = ethers.Wallet.createRandom();
        const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        const expiration = now + 100;
        await api3ClientRrpAuthorizer
          .connect(roles.metaAdmin)
          .setWhitelistExpiration(api3AdminnedEntity, roles.client.address, expiration);
        expect(
          await api3ClientRrpAuthorizer.isAuthorized(
            requestId,
            api3AdminnedEntity,
            endpointId,
            roles.metaAdmin.address,
            designatedWallet.address,
            roles.client.address
          )
        ).to.equal(false);
      });
    });
  });
});
