/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../utils');

let roles;
let airnodeRrp, rrpBeaconServer;
let airnodeAddress, airnodeMnemonic, airnodeXpub, airnodeWallet;
let sponsorWalletAddress, sponsorWallet;
let endpointId, parameters, templateId;

const AdminRank = Object.freeze({
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
});

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    metaAdmin: accounts[1],
    admin: accounts[2],
    superAdmin: accounts[3],
    sponsor: accounts[4],
    updateRequester: accounts[5],
    beaconReader: accounts[6],
    randomPerson: accounts[9],
  };
  const airnodeRrpFactory = await hre.ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const rrpBeaconServerFactory = await hre.ethers.getContractFactory('RrpBeaconServer', roles.deployer);
  rrpBeaconServer = await rrpBeaconServerFactory.deploy(airnodeRrp.address);
  await rrpBeaconServer.connect(roles.deployer).transferMetaAdminStatus(roles.metaAdmin.address);
  await rrpBeaconServer.connect(roles.metaAdmin).setRank(roles.admin.address, AdminRank.Admin);
  await rrpBeaconServer.connect(roles.metaAdmin).setRank(roles.superAdmin.address, AdminRank.SuperAdmin);
  ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = utils.generateRandomAirnodeWallet());
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
  sponsorWalletAddress = utils.deriveSponsorWalletAddress(airnodeXpub, roles.sponsor.address);
  await roles.deployer.sendTransaction({
    to: sponsorWalletAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
  sponsorWallet = utils.deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address).connect(hre.ethers.provider);
  endpointId = utils.generateRandomBytes32();
  parameters = utils.generateRandomBytes();
  await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
  );
});

describe('constructor', function () {
  it('sets AirnodeRrp', async function () {
    expect(await rrpBeaconServer.airnodeRrp()).to.equal(airnodeRrp.address);
  });
  it('sponsors itself', async function () {
    expect(
      await airnodeRrp.sponsorToRequesterToSponsorshipStatus(rrpBeaconServer.address, rrpBeaconServer.address)
    ).to.equal(true);
  });
});

describe('setUpdatePermissionStatus', function () {
  context('Update requester not zero', function () {
    it('sets update permission status', async function () {
      expect(
        await rrpBeaconServer.sponsorToUpdateRequesterToPermissionStatus(
          roles.sponsor.address,
          roles.updateRequester.address
        )
      ).to.equal(false);
      await expect(
        rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true)
      )
        .to.emit(rrpBeaconServer, 'SetUpdatePermissionStatus')
        .withArgs(roles.sponsor.address, roles.updateRequester.address, true);
      expect(
        await rrpBeaconServer.sponsorToUpdateRequesterToPermissionStatus(
          roles.sponsor.address,
          roles.updateRequester.address
        )
      ).to.equal(true);
      await expect(
        rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, false)
      )
        .to.emit(rrpBeaconServer, 'SetUpdatePermissionStatus')
        .withArgs(roles.sponsor.address, roles.updateRequester.address, false);
      expect(
        await rrpBeaconServer.sponsorToUpdateRequesterToPermissionStatus(
          roles.sponsor.address,
          roles.updateRequester.address
        )
      ).to.equal(false);
    });
  });
  context('Update requester zero', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(hre.ethers.constants.AddressZero, false)
      ).to.be.revertedWith('Update requester zero');
    });
  });
});

describe('requestBeaconUpdate', function () {
  context('Request updater permitted', function () {
    context('RRP beacon server sponsored', function () {
      it('requests beacon update', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              '0x',
            ]
          )
        );
        // Request the beacon update
        await expect(
          rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress)
        )
          .to.emit(rrpBeaconServer, 'RequestedBeaconUpdate')
          .withArgs(templateId, roles.sponsor.address, roles.updateRequester.address, requestId, sponsorWalletAddress);
      });
    });
    context('RRP beacon server not sponsored', function () {
      it('reverts', async function () {
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Attempt to request beacon update
        await expect(
          rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress)
        ).to.be.revertedWith('Requester not sponsored');
      });
    });
  });
  context('Request updater not permitted', function () {
    it('reverts', async function () {
      // Attempt to request beacon update
      await expect(
        rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress)
      ).to.be.revertedWith('Caller not permitted');
    });
  });
});

describe('extendWhitelistExpiration', function () {
  context('Caller of rank Admin', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      context('Template exists', function () {
        it('extends whitelist expiration', async function () {
          let whitelistStatus;
          whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
            templateId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
          const expirationTimestamp = 1000;
          await expect(
            rrpBeaconServer
              .connect(roles.admin)
              .extendWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp)
          )
            .to.emit(rrpBeaconServer, 'ExtendedWhitelistExpiration')
            .withArgs(templateId, roles.beaconReader.address, roles.admin.address, expirationTimestamp);
          whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
            templateId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(1000);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        });
      });
      context('Template does not exist', function () {
        it('reverts', async function () {
          await expect(
            rrpBeaconServer
              .connect(roles.admin)
              .extendWhitelistExpiration(utils.generateRandomBytes32(), roles.beaconReader.address, 1000)
          ).to.be.revertedWith('Template does not exist');
        });
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer.connect(roles.admin).extendWhitelistExpiration(templateId, roles.beaconReader.address, 0)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller of rank SuperAdmin', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      context('Template exists', function () {
        it('extends whitelist expiration', async function () {
          let whitelistStatus;
          whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
            templateId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
          const expirationTimestamp = 1000;
          await expect(
            rrpBeaconServer
              .connect(roles.superAdmin)
              .extendWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp)
          )
            .to.emit(rrpBeaconServer, 'ExtendedWhitelistExpiration')
            .withArgs(templateId, roles.beaconReader.address, roles.superAdmin.address, expirationTimestamp);
          whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
            templateId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(1000);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        });
      });
      context('Template does not exist', function () {
        it('reverts', async function () {
          await expect(
            rrpBeaconServer
              .connect(roles.superAdmin)
              .extendWhitelistExpiration(utils.generateRandomBytes32(), roles.beaconReader.address, 1000)
          ).to.be.revertedWith('Template does not exist');
        });
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer.connect(roles.superAdmin).extendWhitelistExpiration(templateId, roles.beaconReader.address, 0)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller meta-admin', function () {
    context('Provided timestamp extends whitelist expiration', function () {
      context('Template exists', function () {
        it('extends whitelist expiration', async function () {
          let whitelistStatus;
          whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
            templateId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
          const expirationTimestamp = 1000;
          await expect(
            rrpBeaconServer
              .connect(roles.metaAdmin)
              .extendWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp)
          )
            .to.emit(rrpBeaconServer, 'ExtendedWhitelistExpiration')
            .withArgs(templateId, roles.beaconReader.address, roles.metaAdmin.address, expirationTimestamp);
          whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
            templateId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(1000);
          expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        });
      });
      context('Template does not exist', function () {
        it('reverts', async function () {
          await expect(
            rrpBeaconServer
              .connect(roles.metaAdmin)
              .extendWhitelistExpiration(utils.generateRandomBytes32(), roles.beaconReader.address, 1000)
          ).to.be.revertedWith('Template does not exist');
        });
      });
    });
    context('Provided timestamp does not extend whitelist expiration', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer.connect(roles.metaAdmin).extendWhitelistExpiration(templateId, roles.beaconReader.address, 0)
        ).to.be.revertedWith('Expiration not extended');
      });
    });
  });
  context('Caller of rank lower than Admin', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer
          .connect(roles.randomPerson)
          .extendWhitelistExpiration(templateId, roles.beaconReader.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('setWhitelistExpiration', function () {
  context('Caller of rank SuperAdmin', function () {
    context('Template exists', function () {
      it('sets whitelist expiration', async function () {
        let whitelistStatus;
        const expirationTimestamp = 1000;
        await expect(
          rrpBeaconServer
            .connect(roles.superAdmin)
            .setWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
          .withArgs(templateId, roles.beaconReader.address, roles.superAdmin.address, expirationTimestamp);
        whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        await expect(
          rrpBeaconServer.connect(roles.superAdmin).setWhitelistExpiration(templateId, roles.beaconReader.address, 0)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
          .withArgs(templateId, roles.beaconReader.address, roles.superAdmin.address, 0);
        whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Template does not exist', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer
            .connect(roles.superAdmin)
            .setWhitelistExpiration(utils.generateRandomBytes32(), roles.beaconReader.address, 1000)
        ).to.be.revertedWith('Template does not exist');
      });
    });
  });
  context('Caller meta-admin', function () {
    context('Template exists', function () {
      it('sets whitelist expiration', async function () {
        let whitelistStatus;
        const expirationTimestamp = 1000;
        await expect(
          rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
          .withArgs(templateId, roles.beaconReader.address, roles.metaAdmin.address, expirationTimestamp);
        whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
        await expect(
          rrpBeaconServer.connect(roles.metaAdmin).setWhitelistExpiration(templateId, roles.beaconReader.address, 0)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistExpiration')
          .withArgs(templateId, roles.beaconReader.address, roles.metaAdmin.address, 0);
        whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Template does not exist', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistExpiration(utils.generateRandomBytes32(), roles.beaconReader.address, 1000)
        ).to.be.revertedWith('Template does not exist');
      });
    });
  });
  context('Caller of rank lower than SuperAdmin', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer.connect(roles.admin).setWhitelistExpiration(templateId, roles.beaconReader.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        rrpBeaconServer.connect(roles.randomPerson).setWhitelistExpiration(templateId, roles.beaconReader.address, 1000)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('setWhitelistStatusPastExpiration', function () {
  context('Caller of rank SuperAdmin', function () {
    context('Template exists', function () {
      it('sets whitelist status past expiration', async function () {
        let whitelistStatus;
        await expect(
          rrpBeaconServer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, true)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistStatusPastExpiration')
          .withArgs(templateId, roles.beaconReader.address, roles.superAdmin.address, true);
        whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
        await expect(
          rrpBeaconServer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, false)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistStatusPastExpiration')
          .withArgs(templateId, roles.beaconReader.address, roles.superAdmin.address, false);
        whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Template does not exist', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer
            .connect(roles.superAdmin)
            .setWhitelistStatusPastExpiration(utils.generateRandomBytes32(), roles.beaconReader.address, true)
        ).to.be.revertedWith('Template does not exist');
      });
    });
  });
  context('Caller meta-admin', function () {
    context('Template exists', function () {
      it('sets whitelist status past expiration', async function () {
        let whitelistStatus;
        await expect(
          rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, true)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistStatusPastExpiration')
          .withArgs(templateId, roles.beaconReader.address, roles.metaAdmin.address, true);
        whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
        await expect(
          rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, false)
        )
          .to.emit(rrpBeaconServer, 'SetWhitelistStatusPastExpiration')
          .withArgs(templateId, roles.beaconReader.address, roles.metaAdmin.address, false);
        whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(
          templateId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      });
    });
    context('Template does not exist', function () {
      it('reverts', async function () {
        await expect(
          rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(utils.generateRandomBytes32(), roles.beaconReader.address, true)
        ).to.be.revertedWith('Template does not exist');
      });
    });
  });
  context('Caller of rank lower than SuperAdmin', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer
          .connect(roles.admin)
          .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, true)
      ).to.be.revertedWith('Caller ranked low');
      await expect(
        rrpBeaconServer
          .connect(roles.randomPerson)
          .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, true)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('readBeacon', function () {
  context('Caller whitelisted', function () {
    context('Caller of rank Admin', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Have the metaAdmin whitelist the beacon reader
        await rrpBeaconServer
          .connect(roles.metaAdmin)
          .setWhitelistStatusPastExpiration(templateId, roles.admin.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(roles.admin).readBeacon(templateId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              '0x',
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
        // Fulfill with 0 status code
        const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
          .timestamp;
        const nextBlockTimestamp = lastBlockTimestamp + 1;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
        const decodedData = 123;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(roles.admin).readBeacon(templateId);
        expect(currentBeacon.value).to.be.equal(decodedData);
        expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
      });
    });
    context('Caller of rank SuperAdmin', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Have the metaAdmin whitelist the beacon reader
        await rrpBeaconServer
          .connect(roles.metaAdmin)
          .setWhitelistStatusPastExpiration(templateId, roles.superAdmin.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(roles.superAdmin).readBeacon(templateId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              '0x',
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
        // Fulfill with 0 status code
        const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
          .timestamp;
        const nextBlockTimestamp = lastBlockTimestamp + 1;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
        const decodedData = 123;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(roles.superAdmin).readBeacon(templateId);
        expect(currentBeacon.value).to.be.equal(decodedData);
        expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
      });
    });
    context('Caller meta-admin', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Have the metaAdmin whitelist the beacon reader
        await rrpBeaconServer
          .connect(roles.metaAdmin)
          .setWhitelistStatusPastExpiration(templateId, roles.metaAdmin.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(roles.metaAdmin).readBeacon(templateId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              '0x',
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
        // Fulfill with 0 status code
        const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
          .timestamp;
        const nextBlockTimestamp = lastBlockTimestamp + 1;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
        const decodedData = 123;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(roles.metaAdmin).readBeacon(templateId);
        expect(currentBeacon.value).to.be.equal(decodedData);
        expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
      });
    });
    context('Caller of rank lower than Admin', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Have the metaAdmin whitelist the beacon reader
        await rrpBeaconServer
          .connect(roles.metaAdmin)
          .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(templateId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              '0x',
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
        // Fulfill with 0 status code
        const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
          .timestamp;
        const nextBlockTimestamp = lastBlockTimestamp + 1;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
        const decodedData = 123;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(templateId);
        expect(currentBeacon.value).to.be.equal(decodedData);
        expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
      });
    });
  });
  context('Caller not whitelisted', function () {
    context('Caller of rank Admin', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(roles.admin).readBeacon(templateId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              '0x',
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
        // Fulfill with 0 status code
        const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
          .timestamp;
        const nextBlockTimestamp = lastBlockTimestamp + 1;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
        const decodedData = 123;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(roles.admin).readBeacon(templateId);
        expect(currentBeacon.value).to.be.equal(decodedData);
        expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
      });
    });
    context('Caller of rank SuperAdmin', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(roles.superAdmin).readBeacon(templateId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              '0x',
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
        // Fulfill with 0 status code
        const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
          .timestamp;
        const nextBlockTimestamp = lastBlockTimestamp + 1;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
        const decodedData = 123;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(roles.superAdmin).readBeacon(templateId);
        expect(currentBeacon.value).to.be.equal(decodedData);
        expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
      });
    });
    context('Caller meta-admin', function () {
      it('reads beacon', async function () {
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Confirm that the beacon is empty
        const initialBeacon = await rrpBeaconServer.connect(roles.metaAdmin).readBeacon(templateId);
        expect(initialBeacon.value).to.be.equal(0);
        expect(initialBeacon.timestamp).to.be.equal(0);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpBeaconServer.address,
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              '0x',
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
        // Fulfill with 0 status code
        const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
          .timestamp;
        const nextBlockTimestamp = lastBlockTimestamp + 1;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
        const decodedData = 123;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        await airnodeRrp
          .connect(sponsorWallet)
          .fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        // Read the beacon again
        const currentBeacon = await rrpBeaconServer.connect(roles.metaAdmin).readBeacon(templateId);
        expect(currentBeacon.value).to.be.equal(decodedData);
        expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
      });
    });
    context('Caller of rank lower than Admin', function () {
      it('reverts', async function () {
        await expect(rrpBeaconServer.connect(roles.beaconReader).readBeacon(templateId)).to.be.revertedWith(
          'Caller not whitelisted'
        );
      });
    });
  });
});

describe('userCanReadBeacon', function () {
  context('Template exists', function () {
    context('User whitelisted', function () {
      context('User of rank Admin', function () {
        it('returns true', async function () {
          await rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(templateId, roles.admin.address, true);
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.admin.address)).to.equal(true);
        });
      });
      context('User of rank SuperAdmin', function () {
        it('returns true', async function () {
          await rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(templateId, roles.superAdmin.address, true);
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.superAdmin.address)).to.equal(true);
        });
      });
      context('User meta-admin', function () {
        it('returns true', async function () {
          await rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(templateId, roles.metaAdmin.address, true);
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.metaAdmin.address)).to.equal(true);
        });
      });
      context('User of rank lower than Admin', function () {
        it('returns true', async function () {
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(false);
          const expirationTimestamp = (await utils.getCurrentTimestamp(hre.ethers.provider)) + 1000;
          await rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp);
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
          await rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, true);
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
          await rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistExpiration(templateId, roles.beaconReader.address, 0);
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(true);
          await rrpBeaconServer
            .connect(roles.metaAdmin)
            .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, false);
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.beaconReader.address)).to.equal(false);
        });
      });
    });
    context('User not whitelisted', function () {
      context('User of rank Admin', function () {
        it('returns true', async function () {
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.admin.address)).to.equal(true);
        });
      });
      context('User of rank SuperAdmin', function () {
        it('returns true', async function () {
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.superAdmin.address)).to.equal(true);
        });
      });
      context('User meta-admin', function () {
        it('returns true', async function () {
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.metaAdmin.address)).to.equal(true);
        });
      });
      context('User of rank lower than Admin', function () {
        it('returns false', async function () {
          expect(await rrpBeaconServer.userCanReadBeacon(templateId, roles.randomPerson.address)).to.equal(false);
        });
      });
    });
  });
  context('Template does not exist', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer.userCanReadBeacon(utils.generateRandomBytes32(), roles.randomPerson.address)
      ).to.be.revertedWith('Template does not exist');
    });
  });
});

describe('templateIdToUserToWhitelistStatus', function () {
  context('Template exists', function () {
    it('returns whitelist status of the user for the template', async function () {
      let whitelistStatus;
      whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(templateId, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      const expirationTimestamp = (await utils.getCurrentTimestamp(hre.ethers.provider)) + 1000;
      await rrpBeaconServer
        .connect(roles.metaAdmin)
        .setWhitelistExpiration(templateId, roles.beaconReader.address, expirationTimestamp);
      whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(templateId, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
      await rrpBeaconServer
        .connect(roles.metaAdmin)
        .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, true);
      whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(templateId, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(expirationTimestamp);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
      await rrpBeaconServer.connect(roles.metaAdmin).setWhitelistExpiration(templateId, roles.beaconReader.address, 0);
      whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(templateId, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(true);
      await rrpBeaconServer
        .connect(roles.metaAdmin)
        .setWhitelistStatusPastExpiration(templateId, roles.beaconReader.address, false);
      whitelistStatus = await rrpBeaconServer.templateIdToUserToWhitelistStatus(templateId, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.whitelistedPastExpiration).to.equal(false);
    });
  });
  context('Template does not exist', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer.templateIdToUserToWhitelistStatus(utils.generateRandomBytes32(), roles.beaconReader.address)
      ).to.be.revertedWith('Template does not exist');
    });
  });
});

// Tests for `fulfill()` should come last because the line below causes all following `fulfill()`
// calls to revert
// await hre.ethers.provider.send('evm_setNextBlockTimestamp', [2 ** 32]);
// This can be solved by adding a `hardhat_reset` call to beforeEach, but that breaks solcover.
describe('fulfill', function () {
  context('Caller Airnode RRP', function () {
    context('requestId has been registered', function () {
      context('Data typecast successfully', function () {
        it('updates beacon', async function () {
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
          await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
          // Compute the expected request ID
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpBeaconServer.address,
                await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                '0x',
              ]
            )
          );
          // Request the beacon update
          await rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
          // Fulfill with 0 status code
          const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
            .timestamp;
          const nextBlockTimestamp = lastBlockTimestamp + 1;
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
          const decodedData = 123;
          const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
            )
          );
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                data,
                signature,
                { gasLimit: 500000 }
              )
          )
            .to.emit(rrpBeaconServer, 'UpdatedBeacon')
            .withArgs(templateId, requestId, decodedData, nextBlockTimestamp);
        });
      });
      context('Data does not typecast successfully', function () {
        it('reverts', async function () {
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
          await rrpBeaconServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
          // Compute the expected request ID
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              [
                'uint256',
                'address',
                'address',
                'uint256',
                'bytes32',
                'address',
                'address',
                'address',
                'bytes4',
                'bytes',
              ],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeRrp.address,
                rrpBeaconServer.address,
                await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                templateId,
                roles.sponsor.address,
                sponsorWalletAddress,
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                '0x',
              ]
            )
          );
          // Request the beacon update
          await rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
          // Fulfill with non-typecastable data
          // Data should not be too large
          let staticCallResult;
          let data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [hre.ethers.BigNumber.from(2).pow(223)]);
          let signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
            )
          );
          staticCallResult = await airnodeRrp
            .connect(sponsorWallet)
            .callStatic.fulfill(
              requestId,
              airnodeAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Value typecasting error');
          // Data should not be too small
          data = hre.ethers.utils.defaultAbiCoder.encode(
            ['int256'],
            [hre.ethers.BigNumber.from(2).pow(223).add(1).mul(-1)]
          );
          signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
            )
          );
          staticCallResult = await airnodeRrp
            .connect(sponsorWallet)
            .callStatic.fulfill(
              requestId,
              airnodeAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Value typecasting error');
          // Year should not be 2038+
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [2 ** 32]);
          await hre.ethers.provider.send('evm_mine');
          data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [123]);
          signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
            )
          );
          staticCallResult = await airnodeRrp
            .connect(sponsorWallet)
            .callStatic.fulfill(
              requestId,
              airnodeAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('Timestamp typecasting error');
        });
      });
    });
    context('Does not refer to an existing request', function () {
      it('reverts', async function () {
        // Endorse the requester
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.randomPerson.address, true);
        // Make the request
        const requestTimeParameters = utils.generateRandomBytes();
        await airnodeRrp
          .connect(roles.randomPerson)
          .makeTemplateRequest(
            templateId,
            roles.sponsor.address,
            sponsorWalletAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            requestTimeParameters,
            { gasLimit: 500000 }
          );
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              roles.randomPerson.address,
              (await airnodeRrp.requesterToRequestCountPlusOne(roles.randomPerson.address)).sub(1),
              templateId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              requestTimeParameters,
            ]
          )
        );
        // Fulfill the request
        const data = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['uint256', 'string'], ['123456', 'hello'])
        );
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
          )
        );
        const staticCallResult = await airnodeRrp
          .connect(sponsorWallet)
          .callStatic.fulfill(
            requestId,
            airnodeAddress,
            rrpBeaconServer.address,
            rrpBeaconServer.interface.getSighash('fulfill'),
            data,
            signature,
            { gasLimit: 500000 }
          );
        expect(staticCallResult.callSuccess).to.equal(false);
        expect(utils.decodeRevertString(staticCallResult.callData)).to.equal('No such request made');
      });
    });
  });
  context('Caller not Airnode RRP', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer.connect(roles.randomPerson).fulfill(hre.ethers.constants.HashZero, '0x')
      ).to.be.revertedWith('Caller not Airnode RRP');
    });
  });
});
