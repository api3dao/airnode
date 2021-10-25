/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../utils');

let roles;
let accessControlRegistry, airnodeRequesterAuthorizer;
let airnodeRequesterAuthorizerAdminRoleDescription = 'AirnodeRequesterAuthorizer admin';
let adminRole, whitelistExpirationExtenderRole, whitelistExpirationSetterRole, indefiniteWhitelisterRole;
let airnodeAddress, airnodeMnemonic, airnodeWallet;
let endpointId = utils.generateRandomBytes32();

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    whitelistExpirationExtender: accounts[1],
    whitelistExpirationSetter: accounts[2],
    indefiniteWhitelister: accounts[3],
    anotherIndefiniteWhitelister: accounts[4],
    requester: accounts[5],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const airnodeRequesterAuthorizerFactory = await hre.ethers.getContractFactory(
    'AirnodeRequesterAuthorizer',
    roles.deployer
  );
  airnodeRequesterAuthorizer = await airnodeRequesterAuthorizerFactory.deploy(
    accessControlRegistry.address,
    airnodeRequesterAuthorizerAdminRoleDescription
  );
  ({ airnodeAddress: airnodeAddress, airnodeMnemonic: airnodeMnemonic } = utils.generateRandomAirnodeWallet());
  await roles.deployer.sendTransaction({
    to: airnodeAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);
  const airnodeRootRole = await accessControlRegistry.deriveRootRole(airnodeAddress);
  adminRole = await airnodeRequesterAuthorizer.deriveAdminRole(airnodeAddress);
  whitelistExpirationExtenderRole = await airnodeRequesterAuthorizer.deriveWhitelistExpirationExtenderRole(
    airnodeAddress
  );
  whitelistExpirationSetterRole = await airnodeRequesterAuthorizer.deriveWhitelistExpirationSetterRole(airnodeAddress);
  indefiniteWhitelisterRole = await airnodeRequesterAuthorizer.deriveIndefiniteWhitelisterRole(airnodeAddress);
  await accessControlRegistry
    .connect(airnodeWallet)
    .initializeAndGrantRoles(
      [airnodeRootRole, adminRole, adminRole, adminRole, adminRole],
      [
        airnodeRequesterAuthorizerAdminRoleDescription,
        await airnodeRequesterAuthorizer.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
        await airnodeRequesterAuthorizer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
        await airnodeRequesterAuthorizer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
        await airnodeRequesterAuthorizer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
      ],
      [
        hre.ethers.constants.AddressZero,
        roles.whitelistExpirationExtender.address,
        roles.whitelistExpirationSetter.address,
        roles.indefiniteWhitelister.address,
        roles.anotherIndefiniteWhitelister.address,
      ],
      { gasLimit: 1000000 }
    );
});

describe('constructor', function () {
  context('AccessControlRegistry address is not zero', function () {
    context('Admin role description string is not empty', function () {
      it('constructs', async function () {
        const airnodeRequesterAuthorizerFactory = await hre.ethers.getContractFactory(
          'AirnodeRequesterAuthorizer',
          roles.deployer
        );
        airnodeRequesterAuthorizer = await airnodeRequesterAuthorizerFactory.deploy(
          accessControlRegistry.address,
          airnodeRequesterAuthorizerAdminRoleDescription
        );
        expect(await airnodeRequesterAuthorizer.accessControlRegistry()).to.equal(accessControlRegistry.address);
        expect(await airnodeRequesterAuthorizer.adminRoleDescription()).to.equal(
          airnodeRequesterAuthorizerAdminRoleDescription
        );
      });
    });
    context('Admin role description string is empty', function () {
      it('reverts', async function () {
        const airnodeRequesterAuthorizerFactory = await hre.ethers.getContractFactory(
          'AirnodeRequesterAuthorizer',
          roles.deployer
        );
        await expect(airnodeRequesterAuthorizerFactory.deploy(accessControlRegistry.address, '')).to.be.revertedWith(
          'Admin role description empty'
        );
      });
    });
  });
  context('AccessControlRegistry address is zero', function () {
    it('reverts', async function () {
      const airnodeRequesterAuthorizerFactory = await hre.ethers.getContractFactory(
        'AirnodeRequesterAuthorizer',
        roles.deployer
      );
      await expect(
        airnodeRequesterAuthorizerFactory.deploy(
          hre.ethers.constants.AddressZero,
          airnodeRequesterAuthorizerAdminRoleDescription
        )
      ).to.be.revertedWith('ACR address zero');
    });
  });
});

describe('extendWhitelistExpiration', function () {
  context('Sender has whitelist expiration extender role', function () {
    context('Timestamp extends whitelist expiration', function () {
      it('extends whitelist expiration', async function () {
        let whitelistStatus;
        whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        const expirationTimestamp = 1000;
        await expect(
          airnodeRequesterAuthorizer
            .connect(roles.whitelistExpirationExtender)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
        )
          .to.emit(airnodeRequesterAuthorizer, 'ExtendedWhitelistExpiration')
          .withArgs(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.whitelistExpirationExtender.address,
            expirationTimestamp
          );
        whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(1000);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      });
    });
    context('Timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          airnodeRequesterAuthorizer
            .connect(roles.whitelistExpirationExtender)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
        ).to.be.revertedWith('Does not extend expiration');
      });
    });
  });
  context('Sender is the Airnode address', function () {
    context('Timestamp extends whitelist expiration', function () {
      it('extends whitelist expiration', async function () {
        await accessControlRegistry
          .connect(airnodeWallet)
          .renounceRole(whitelistExpirationExtenderRole, airnodeAddress, { gasLimit: 1000000 });
        let whitelistStatus;
        whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        const expirationTimestamp = 1000;
        await expect(
          airnodeRequesterAuthorizer
            .connect(airnodeWallet)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp, {
              gasLimit: 1000000,
            })
        )
          .to.emit(airnodeRequesterAuthorizer, 'ExtendedWhitelistExpiration')
          .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, expirationTimestamp);
        whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(1000);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      });
    });
    context('Timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await accessControlRegistry
          .connect(airnodeWallet)
          .renounceRole(whitelistExpirationExtenderRole, airnodeAddress, { gasLimit: 1000000 });
        await expect(
          airnodeRequesterAuthorizer
            .connect(airnodeWallet)
            .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0, { gasLimit: 1000000 })
        ).to.be.revertedWith('Does not extend expiration');
      });
    });
  });
  context('Sender does not have whitelist extender role and is not the Airnode address', function () {
    it('reverts', async function () {
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.randomPerson)
          .extendWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 1000)
      ).to.be.revertedWith('Not expiration extender');
    });
  });
});

describe('setWhitelistExpiration', function () {
  context('Sender has whitelist expiration setter role', function () {
    it('sets whitelist expiration', async function () {
      let whitelistStatus;
      const expirationTimestamp = 1000;
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp)
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetWhitelistExpiration')
        .withArgs(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.whitelistExpirationSetter.address,
          expirationTimestamp
        );
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.whitelistExpirationSetter.address, 0);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
    });
  });
  context('Sender is the Airnode address', function () {
    it('sets whitelist expiration', async function () {
      await accessControlRegistry
        .connect(airnodeWallet)
        .renounceRole(whitelistExpirationSetterRole, airnodeAddress, { gasLimit: 1000000 });
      let whitelistStatus;
      const expirationTimestamp = 1000;
      await expect(
        airnodeRequesterAuthorizer
          .connect(airnodeWallet)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, expirationTimestamp, {
            gasLimit: 1000000,
          })
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, expirationTimestamp);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(
        airnodeRequesterAuthorizer
          .connect(airnodeWallet)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0, { gasLimit: 1000000 })
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetWhitelistExpiration')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, 0);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
    });
  });
  context('Sender does not have whitelist expiration setter role and is not the Airnode address', function () {
    it('reverts', async function () {
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.randomPerson)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 0)
      ).to.be.revertedWith('Not expiration setter');
    });
  });
});

describe('setIndefiniteWhitelistStatus', function () {
  context('Sender has indefinite whitelister role', function () {
    it('sets indefinite whitelist status', async function () {
      let whitelistStatus;
      // Whitelist indefinitely
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, true, 1);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(
        await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(true);
      // Whitelisting indefinitely again should have no effect
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, true, 1);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(
        await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(true);
      // Revoke indefinite whitelisting
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, false, 0);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(
        await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(false);
      // Revoking indefinite whitelisting again should have no effect
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false)
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, roles.indefiniteWhitelister.address, false, 0);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(
        await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          roles.indefiniteWhitelister.address
        )
      ).to.equal(false);
    });
  });
  context('Sender is the Airnode address', function () {
    it('sets indefinite whitelist status', async function () {
      await accessControlRegistry
        .connect(airnodeWallet)
        .renounceRole(indefiniteWhitelisterRole, airnodeAddress, { gasLimit: 1000000 });
      let whitelistStatus;
      // Whitelist indefinitely
      await expect(
        airnodeRequesterAuthorizer
          .connect(airnodeWallet)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true, {
            gasLimit: 1000000,
          })
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, true, 1);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(
        await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          airnodeAddress
        )
      ).to.equal(true);
      // Whitelisting indefinitely again should have no effect
      await expect(
        airnodeRequesterAuthorizer
          .connect(airnodeWallet)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true, {
            gasLimit: 1000000,
          })
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, true, 1);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
      expect(
        await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          airnodeAddress
        )
      ).to.equal(true);
      // Revoke indefinite whitelisting
      await expect(
        airnodeRequesterAuthorizer
          .connect(airnodeWallet)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false, {
            gasLimit: 1000000,
          })
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, false, 0);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(
        await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          airnodeAddress
        )
      ).to.equal(false);
      // Revoking indefinite whitelisting again should have no effect
      await expect(
        airnodeRequesterAuthorizer
          .connect(airnodeWallet)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false, {
            gasLimit: 1000000,
          })
      )
        .to.emit(airnodeRequesterAuthorizer, 'SetIndefiniteWhitelistStatus')
        .withArgs(airnodeAddress, endpointId, roles.requester.address, airnodeAddress, false, 0);
      whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeAddress,
        endpointId,
        roles.requester.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      expect(
        await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address,
          airnodeAddress
        )
      ).to.equal(false);
    });
  });
  context('Sender does not have indefinite whitelister role and is not the Airnode address', function () {
    it('reverts', async function () {
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.randomPerson)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true)
      ).to.be.revertedWith('Not indefinite whitelister');
    });
  });
});

describe('revokeIndefiniteWhitelistStatus', function () {
  context('setter does not have the indefinite whitelister role', function () {
    context('setter is not the Airnode address', function () {
      it('revokes indefinite whitelist status', async function () {
        // Grant indefinite whitelist status
        await airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        // Revoke the indefinite whitelister role
        await accessControlRegistry
          .connect(airnodeWallet)
          .revokeRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address, { gasLimit: 1000000 });
        // Revoke the indefinite whitelist status
        await expect(
          airnodeRequesterAuthorizer
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address
            )
        )
          .to.emit(airnodeRequesterAuthorizer, 'RevokedIndefiniteWhitelistStatus')
          .withArgs(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.indefiniteWhitelister.address,
            roles.randomPerson.address,
            0
          );
        const whitelistStatus = await airnodeRequesterAuthorizer.airnodeToEndpointIdToRequesterToWhitelistStatus(
          airnodeAddress,
          endpointId,
          roles.requester.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        // Revoking twice should not emit an event
        await expect(
          airnodeRequesterAuthorizer
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(
              airnodeAddress,
              endpointId,
              roles.requester.address,
              roles.indefiniteWhitelister.address
            )
        ).to.not.emit(airnodeRequesterAuthorizer, 'RevokedIndefiniteWhitelistStatus');
      });
    });
    context('setter is the Airnode address', function () {
      it('reverts', async function () {
        await accessControlRegistry
          .connect(airnodeWallet)
          .renounceRole(indefiniteWhitelisterRole, airnodeAddress, { gasLimit: 1000000 });
        await expect(
          airnodeRequesterAuthorizer
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, airnodeAddress)
        ).to.be.revertedWith('setter is indefinite whitelister');
      });
    });
  });
  context('setter has the indefinite whitelister role', function () {
    it('reverts', async function () {
      await expect(
        airnodeRequesterAuthorizer
          .connect(roles.randomPerson)
          .revokeIndefiniteWhitelistStatus(
            airnodeAddress,
            endpointId,
            roles.requester.address,
            roles.indefiniteWhitelister.address
          )
      ).to.be.revertedWith('setter is indefinite whitelister');
    });
  });
});

describe('deriveAdminRole', function () {
  it('derives admin role for the Airnode', async function () {
    expect(await airnodeRequesterAuthorizer.deriveAdminRole(airnodeAddress)).to.equal(adminRole);
  });
});

describe('deriveWhitelistExpirationExtenderRole', function () {
  it('derives whitelist expiration extender role for the Airnode', async function () {
    expect(await airnodeRequesterAuthorizer.deriveWhitelistExpirationExtenderRole(airnodeAddress)).to.equal(
      whitelistExpirationExtenderRole
    );
  });
});

describe('deriveWhitelistExpirationSetterRole', function () {
  it('derives whitelist expiration setter role for the Airnode', async function () {
    expect(await airnodeRequesterAuthorizer.deriveWhitelistExpirationSetterRole(airnodeAddress)).to.equal(
      whitelistExpirationSetterRole
    );
  });
});

describe('deriveIndefiniteWhitelisterRole', function () {
  it('derives indefinite whitelister role for the Airnode', async function () {
    expect(await airnodeRequesterAuthorizer.deriveIndefiniteWhitelisterRole(airnodeAddress)).to.equal(
      indefiniteWhitelisterRole
    );
  });
});

describe('requesterIsWhitelisted', function () {
  context('Requester is whitelisted indefinitely', function () {
    context('Requester is whitelisted temporarily', function () {
      it('returns true', async function () {
        await airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        await airnodeRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await airnodeRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns true', async function () {
        await airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await airnodeRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
        // Also test the case with two indefinite whitelisters
        await airnodeRequesterAuthorizer
          .connect(roles.anotherIndefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await airnodeRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
        await airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false);
        expect(
          await airnodeRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
        await airnodeRequesterAuthorizer
          .connect(roles.anotherIndefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, false);
        expect(
          await airnodeRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(false);
      });
    });
  });
  context('Requester is not whitelisted indefinitely', function () {
    context('Requester is whitelisted temporarily', function () {
      it('returns true', async function () {
        await airnodeRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await airnodeRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns false', async function () {
        expect(
          await airnodeRequesterAuthorizer.requesterIsWhitelisted(airnodeAddress, endpointId, roles.requester.address)
        ).to.equal(false);
      });
    });
  });
});

describe('isAuthorized', function () {
  context('Requester is whitelisted indefinitely', function () {
    context('Requester is whitelisted temporarily', function () {
      it('returns true', async function () {
        await airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        await airnodeRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await airnodeRequesterAuthorizer.isAuthorized(
            utils.generateRandomBytes32(),
            airnodeAddress,
            endpointId,
            utils.generateRandomAddress(),
            roles.requester.address
          )
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns true', async function () {
        await airnodeRequesterAuthorizer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(airnodeAddress, endpointId, roles.requester.address, true);
        expect(
          await airnodeRequesterAuthorizer.isAuthorized(
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
  context('Requester is not whitelisted indefinitely', function () {
    context('Requester is whitelisted temporarily', function () {
      it('returns true', async function () {
        await airnodeRequesterAuthorizer
          .connect(roles.whitelistExpirationSetter)
          .setWhitelistExpiration(airnodeAddress, endpointId, roles.requester.address, 2000000000);
        expect(
          await airnodeRequesterAuthorizer.isAuthorized(
            utils.generateRandomBytes32(),
            airnodeAddress,
            endpointId,
            utils.generateRandomAddress(),
            roles.requester.address
          )
        ).to.equal(true);
      });
    });
    context('Requester is not whitelisted temporarily', function () {
      it('returns false', async function () {
        expect(
          await airnodeRequesterAuthorizer.isAuthorized(
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
