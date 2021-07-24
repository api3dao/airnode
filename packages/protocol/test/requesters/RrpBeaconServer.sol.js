/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

let roles;
let airnodeRrp, rrpBeaconServer;
let airnodeAddress, airnodeMnemonic, airnodeXpub;
let sponsorWalletAddress;

const AdminRank = Object.freeze({
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
  MetaAdmin: hre.ethers.BigNumber.from(2).pow(256).sub(1),
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
  rrpBeaconServer = await rrpBeaconServerFactory.deploy(airnodeRrp.address, roles.metaAdmin.address);
  ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = utils.generateRandomAirnodeWallet());
  sponsorWalletAddress = utils.deriveSponsorWalletAddress(airnodeXpub, roles.sponsor.address);
  await roles.deployer.sendTransaction({
    to: sponsorWalletAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
});

describe('requestBeaconUpdate', function () {
  context('Caller sponsored', function () {
    context('RRP beacon server sponsored', function () {
      it('requests beacon update', async function () {
        // Sponsor the chain of request
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.updateRequester.address, true);
        // Create the template
        const endpointId = utils.generateRandomBytes32();
        const parameters = utils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              (await hre.ethers.provider.getNetwork()).chainId,
              rrpBeaconServer.address,
              templateId,
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
        // Only sponsor the caller
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.updateRequester.address, true);
        // Create the template
        const endpointId = utils.generateRandomBytes32();
        const parameters = utils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Attempt to request beacon update
        await expect(
          rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress)
        ).to.be.revertedWith('Requester not sponsored');
      });
    });
  });
  context('Caller not sponsored', function () {
    it('reverts', async function () {
      // Create the template
      const endpointId = utils.generateRandomBytes32();
      const parameters = utils.generateRandomBytes();
      await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
      const templateId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
      );
      // Attempt to request beacon update
      await expect(
        rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress)
      ).to.be.revertedWith('Caller not sponsored');
    });
  });
});

describe('readBeacon', function () {
  context('Caller whitelisted', function () {
    it('reads beacon', async function () {
      // Sponsor the chain of request
      await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
      await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.updateRequester.address, true);
      // Create the template
      const endpointId = utils.generateRandomBytes32();
      const parameters = utils.generateRandomBytes();
      await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
      const templateId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
      );
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
          ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
          [
            await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
            (await hre.ethers.provider.getNetwork()).chainId,
            rrpBeaconServer.address,
            templateId,
            '0x',
          ]
        )
      );
      // Request the beacon update
      await rrpBeaconServer
        .connect(roles.updateRequester)
        .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
      // Fulfill with 0 status code
      const sponsorWallet = utils
        .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
        .connect(hre.ethers.provider);
      const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
        .timestamp;
      const nextBlockTimestamp = lastBlockTimestamp + 1;
      await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
      const statusCode = 0;
      const decodedData = 123;
      const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
      await airnodeRrp
        .connect(sponsorWallet)
        .fulfill(
          requestId,
          airnodeAddress,
          statusCode,
          data,
          rrpBeaconServer.address,
          rrpBeaconServer.interface.getSighash('fulfill'),
          { gasLimit: 500000 }
        );
      // Read the beacon again
      const currentBeacon = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(templateId);
      expect(currentBeacon.value).to.be.equal(decodedData);
      expect(currentBeacon.timestamp).to.be.equal(nextBlockTimestamp);
    });
  });
  context('Caller not whitelisted', function () {
    it('reverts', async function () {
      const templateId = utils.generateRandomBytes32();
      await expect(rrpBeaconServer.connect(roles.randomPerson).readBeacon(templateId)).to.be.revertedWith(
        'Caller not whitelisted'
      );
    });
  });
});

describe('getRank', function () {
  it('returns the largest possible rank for the meta admin', async function () {
    const templateId1 = utils.generateRandomBytes32();
    const templateId2 = utils.generateRandomBytes32();
    // Have the metaAdmin appoint a superAdmin for template1
    await rrpBeaconServer.connect(roles.metaAdmin).setRank(templateId1, roles.superAdmin.address, AdminRank.SuperAdmin);
    // Have the superAdmin appoint an admin for template1
    await rrpBeaconServer.connect(roles.superAdmin).setRank(templateId1, roles.admin.address, AdminRank.Admin);
    // metaAdmin has the highest possible rank for templateId1 and templateId2
    expect(await rrpBeaconServer.getRank(templateId1, roles.metaAdmin.address)).to.be.equal(AdminRank.MetaAdmin);
    expect(await rrpBeaconServer.getRank(templateId2, roles.metaAdmin.address)).to.be.equal(AdminRank.MetaAdmin);
    // superAdmin and admin have the newly appointed ranks for templateId1...
    expect(await rrpBeaconServer.getRank(templateId1, roles.superAdmin.address)).to.be.equal(AdminRank.SuperAdmin);
    expect(await rrpBeaconServer.getRank(templateId1, roles.admin.address)).to.be.equal(AdminRank.Admin);
    // ... but not for templateId2
    expect(await rrpBeaconServer.getRank(templateId2, roles.superAdmin.address)).to.be.equal(AdminRank.Unauthorized);
    expect(await rrpBeaconServer.getRank(templateId2, roles.admin.address)).to.be.equal(AdminRank.Unauthorized);
  });
});

// Tests for `fulfill()` should come last because the line below causes all following `fulfill()`
// calls to revert
// await hre.ethers.provider.send('evm_setNextBlockTimestamp', [2 ** 32]);
// This can be solved by adding a `hardhat_reset` call to beforeEach, but that breaks solcover.
describe('fulfill', function () {
  context('Caller Airnode RRP', function () {
    context('Status code 0', function () {
      context('Data typecast successfully', function () {
        it('updates beacon', async function () {
          // Sponsor the chain of request
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.updateRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Compute the expected request ID
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpBeaconServer.address,
                templateId,
                '0x',
              ]
            )
          );
          // Request the beacon update
          await rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
          // Fulfill with 0 status code
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const lastBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber()))
            .timestamp;
          const nextBlockTimestamp = lastBlockTimestamp + 1;
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
          const statusCode = 0;
          const decodedData = 123;
          const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                statusCode,
                data,
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          )
            .to.emit(rrpBeaconServer, 'UpdatedBeacon')
            .withArgs(templateId, requestId, decodedData, nextBlockTimestamp);
        });
      });
      context('Data does not typecast successfully', function () {
        it('reverts', async function () {
          // Sponsor the chain of request
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
          await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.updateRequester.address, true);
          // Create the template
          const endpointId = utils.generateRandomBytes32();
          const parameters = utils.generateRandomBytes();
          await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
          const templateId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
          );
          // Compute the expected request ID
          const requestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [
                await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
                (await hre.ethers.provider.getNetwork()).chainId,
                rrpBeaconServer.address,
                templateId,
                '0x',
              ]
            )
          );
          // Request the beacon update
          await rrpBeaconServer
            .connect(roles.updateRequester)
            .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
          // Fulfill with non-typecastable data
          const sponsorWallet = utils
            .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
            .connect(hre.ethers.provider);
          const statusCode = 0;
          // Data should not be too large
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                statusCode,
                hre.ethers.utils.defaultAbiCoder.encode(['int256'], [hre.ethers.BigNumber.from(2).pow(223)]),
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Fulfillment failed');
          // Data should not be too small
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                statusCode,
                hre.ethers.utils.defaultAbiCoder.encode(
                  ['int256'],
                  [hre.ethers.BigNumber.from(2).pow(223).add(1).mul(-1)]
                ),
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Fulfillment failed');
          // Year should not be 2106
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [2 ** 32]);
          await expect(
            airnodeRrp
              .connect(sponsorWallet)
              .fulfill(
                requestId,
                airnodeAddress,
                statusCode,
                hre.ethers.utils.defaultAbiCoder.encode(['int256'], [123]),
                rrpBeaconServer.address,
                rrpBeaconServer.interface.getSighash('fulfill'),
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Fulfillment failed');
        });
      });
    });
    context('Status code not 0', function () {
      it('emits an event', async function () {
        // Sponsor the chain of request
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(rrpBeaconServer.address, true);
        await airnodeRrp.connect(roles.sponsor).setSponsorshipStatus(roles.updateRequester.address, true);
        // Create the template
        const endpointId = utils.generateRandomBytes32();
        const parameters = utils.generateRandomBytes();
        await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, parameters);
        const templateId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, parameters])
        );
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [
              await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
              (await hre.ethers.provider.getNetwork()).chainId,
              rrpBeaconServer.address,
              templateId,
              '0x',
            ]
          )
        );
        // Request the beacon update
        await rrpBeaconServer
          .connect(roles.updateRequester)
          .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress);
        // Fulfill with non-zero status code
        const sponsorWallet = utils
          .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
          .connect(hre.ethers.provider);
        const statusCode = 3;
        await expect(
          airnodeRrp
            .connect(sponsorWallet)
            .fulfill(
              requestId,
              airnodeAddress,
              statusCode,
              '0x',
              rrpBeaconServer.address,
              rrpBeaconServer.interface.getSighash('fulfill'),
              { gasLimit: 500000 }
            )
        )
          .to.emit(rrpBeaconServer, 'ErroredBeaconUpdate')
          .withArgs(templateId, requestId, statusCode);
      });
    });
  });
  context('Caller not Airnode RRP', function () {
    it('reverts', async function () {
      await expect(
        rrpBeaconServer.connect(roles.randomPerson).fulfill(hre.ethers.constants.HashZero, 0, '0x')
      ).to.be.revertedWith('Caller not Airnode RRP');
    });
  });
});
