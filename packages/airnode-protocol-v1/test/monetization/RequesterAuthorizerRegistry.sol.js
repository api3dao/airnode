/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry, requesterAuthorizerRegistry;
let requesterAuthorizerRegistryAdminRoleDescription = 'RequesterAuthorizerRegistry admin';

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    registrar: accounts[2],
    airnode: accounts[3],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const requesterAuthorizerRegistryFactory = await hre.ethers.getContractFactory(
    'RequesterAuthorizerRegistry',
    roles.deployer
  );
  requesterAuthorizerRegistry = await requesterAuthorizerRegistryFactory.deploy(
    accessControlRegistry.address,
    requesterAuthorizerRegistryAdminRoleDescription,
    roles.manager.address
  );
  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  const adminRole = await requesterAuthorizerRegistry.adminRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(managerRootRole, requesterAuthorizerRegistryAdminRoleDescription);
  const registrarRole = await requesterAuthorizerRegistry.registrarRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(adminRole, await requesterAuthorizerRegistry.REGISTRAR_ROLE_DESCRIPTION());
  await accessControlRegistry.connect(roles.manager).grantRole(registrarRole, roles.registrar.address);
});

describe('registerChainRequesterAuthorizer', function () {
  context('Sender has the registrar role', function () {
    context('Chain ID is not zero', function () {
      context('RequesterAuthorizer has not been set before', function () {
        context('RequesterAuthorizer address is not zero', function () {
          it('sets RequesterAuthorizer address for the chain', async function () {
            const chainId = 3;
            const requesterAuthorizerAddress = testUtils.generateRandomAddress();
            let requesterAuthorizerAddressFetchAttempt =
              await requesterAuthorizerRegistry.tryReadChainRequesterAuthorizer(chainId);
            expect(requesterAuthorizerAddressFetchAttempt.success).to.equal(false);
            expect(requesterAuthorizerAddressFetchAttempt.requesterAuthorizer).to.equal(
              hre.ethers.constants.AddressZero
            );
            await expect(
              requesterAuthorizerRegistry
                .connect(roles.registrar)
                .registerChainRequesterAuthorizer(chainId, requesterAuthorizerAddress)
            )
              .to.emit(requesterAuthorizerRegistry, 'RegisteredChainRequesterAuthorizer')
              .withArgs(chainId, requesterAuthorizerAddress, roles.registrar.address);
            requesterAuthorizerAddressFetchAttempt = await requesterAuthorizerRegistry.tryReadChainRequesterAuthorizer(
              chainId
            );
            expect(requesterAuthorizerAddressFetchAttempt.success).to.equal(true);
            expect(requesterAuthorizerAddressFetchAttempt.requesterAuthorizer).to.equal(requesterAuthorizerAddress);
          });
        });
        context('RequesterAuthorizer address is zero', function () {
          it('reverts', async function () {
            const chainId = 3;
            const requesterAuthorizerAddress = hre.ethers.constants.AddressZero;
            await expect(
              requesterAuthorizerRegistry
                .connect(roles.registrar)
                .registerChainRequesterAuthorizer(chainId, requesterAuthorizerAddress)
            ).to.be.revertedWith('Cannot register zero');
          });
        });
      });
      context('RequesterAuthorizer has been set before', function () {
        it('reverts', async function () {
          const chainId = 3;
          const requesterAuthorizerAddress = testUtils.generateRandomAddress();
          await requesterAuthorizerRegistry
            .connect(roles.registrar)
            .registerChainRequesterAuthorizer(chainId, requesterAuthorizerAddress);
          await expect(
            requesterAuthorizerRegistry
              .connect(roles.registrar)
              .registerChainRequesterAuthorizer(chainId, requesterAuthorizerAddress)
          ).to.be.revertedWith('Chain Authorizer already set');
        });
      });
    });
    context('Chain ID is zero', function () {
      it('reverts', async function () {
        const chainId = 0;
        const requesterAuthorizerAddress = testUtils.generateRandomAddress();
        await expect(
          requesterAuthorizerRegistry
            .connect(roles.registrar)
            .registerChainRequesterAuthorizer(chainId, requesterAuthorizerAddress)
        ).to.be.revertedWith('Chain ID zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Chain ID is not zero', function () {
      context('RequesterAuthorizer address is not zero', function () {
        it('sets default price', async function () {
          const chainId = 3;
          const requesterAuthorizerAddress = testUtils.generateRandomAddress();
          let requesterAuthorizerAddressFetchAttempt =
            await requesterAuthorizerRegistry.tryReadChainRequesterAuthorizer(chainId);
          expect(requesterAuthorizerAddressFetchAttempt.success).to.equal(false);
          expect(requesterAuthorizerAddressFetchAttempt.requesterAuthorizer).to.equal(hre.ethers.constants.AddressZero);
          await expect(
            requesterAuthorizerRegistry
              .connect(roles.manager)
              .registerChainRequesterAuthorizer(chainId, requesterAuthorizerAddress)
          )
            .to.emit(requesterAuthorizerRegistry, 'RegisteredChainRequesterAuthorizer')
            .withArgs(chainId, requesterAuthorizerAddress, roles.manager.address);
          requesterAuthorizerAddressFetchAttempt = await requesterAuthorizerRegistry.tryReadChainRequesterAuthorizer(
            chainId
          );
          expect(requesterAuthorizerAddressFetchAttempt.success).to.equal(true);
          expect(requesterAuthorizerAddressFetchAttempt.requesterAuthorizer).to.equal(requesterAuthorizerAddress);
        });
      });
      context('RequesterAuthorizer address is zero', function () {
        it('reverts', async function () {
          const chainId = 3;
          const requesterAuthorizerAddress = hre.ethers.constants.AddressZero;
          await expect(
            requesterAuthorizerRegistry
              .connect(roles.manager)
              .registerChainRequesterAuthorizer(chainId, requesterAuthorizerAddress)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Chain ID is zero', function () {
      it('reverts', async function () {
        const chainId = 0;
        const requesterAuthorizerAddress = testUtils.generateRandomAddress();
        await expect(
          requesterAuthorizerRegistry
            .connect(roles.manager)
            .registerChainRequesterAuthorizer(chainId, requesterAuthorizerAddress)
        ).to.be.revertedWith('Chain ID zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const chainId = 3;
      const requesterAuthorizerAddress = testUtils.generateRandomAddress();
      await expect(
        requesterAuthorizerRegistry
          .connect(roles.randomPerson)
          .registerChainRequesterAuthorizer(chainId, requesterAuthorizerAddress)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});
