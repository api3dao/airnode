/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry, airnodeRrp, rrpBeaconServer, selfServeRrpBeaconServerWhitelister;
let rrpBeaconServerAdminRoleDescription = 'RrpBeaconServer admin';
let adminRole;
let airnodeAddress, airnodeMnemonic, airnodeXpub, airnodeWallet;
let sponsorWalletAddress, sponsorWallet;
let beaconIdExpirationTimeStamp, encodedTimestamp, encodedTimestamp2;
let endpointId, endpointId2, templateParameters, templateId, templateId2, beaconParameters, beaconId, beaconId2;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    sponsor: accounts[6],
    updateRequester: accounts[7],
    beaconReader: accounts[8],
    anotherBeaconReader: accounts[9],
    randomPerson: accounts[10],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const airnodeRrpFactory = await hre.ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const rrpBeaconServerFactory = await hre.ethers.getContractFactory('RrpBeaconServer', roles.deployer);
  rrpBeaconServer = await rrpBeaconServerFactory.deploy(
    accessControlRegistry.address,
    rrpBeaconServerAdminRoleDescription,
    roles.manager.address,
    airnodeRrp.address
  );
  const selfServeRrpBeaconServerWhitelisterFactory = await hre.ethers.getContractFactory(
    'SelfServeRrpBeaconServerWhitelister',
    roles.manager
  );

  ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = testUtils.generateRandomAirnodeWallet());
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
  sponsorWalletAddress = testUtils.deriveSponsorWalletAddress(airnodeXpub, roles.sponsor.address);
  await roles.deployer.sendTransaction({
    to: sponsorWalletAddress,
    value: hre.ethers.utils.parseEther('1'),
  });
  sponsorWallet = testUtils.deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address).connect(hre.ethers.provider);
  endpointId = testUtils.generateRandomBytes32();
  endpointId2 = testUtils.generateRandomBytes32();
  templateParameters = testUtils.generateRandomBytes();
  await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId, templateParameters);
  await airnodeRrp.connect(roles.randomPerson).createTemplate(airnodeAddress, endpointId2, templateParameters);
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, templateParameters])
  );
  templateId2 = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId2, templateParameters])
  );

  beaconParameters = testUtils.generateRandomBytes();
  beaconId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, beaconParameters])
  );
  beaconId2 = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId2, beaconParameters])
  );

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
        beaconParameters,
      ]
    )
  );
  // Request the beacon update
  await rrpBeaconServer
    .connect(roles.updateRequester)
    .requestBeaconUpdate(templateId, roles.sponsor.address, sponsorWalletAddress, beaconParameters);
  // Fulfill
  const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
  await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
  const encodedData = 123;
  encodedTimestamp = now;
  const data = hre.ethers.utils.defaultAbiCoder.encode(['int256', 'uint256'], [encodedData, encodedTimestamp]);
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

  // Setup another beaconId to read from

  // Compute the expected request ID
  const requestId2 = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeRrp.address,
        rrpBeaconServer.address,
        await airnodeRrp.requesterToRequestCountPlusOne(rrpBeaconServer.address),
        templateId2,
        roles.sponsor.address,
        sponsorWalletAddress,
        rrpBeaconServer.address,
        rrpBeaconServer.interface.getSighash('fulfill'),
        beaconParameters,
      ]
    )
  );

  await rrpBeaconServer
    .connect(roles.updateRequester)
    .requestBeaconUpdate(templateId2, roles.sponsor.address, sponsorWalletAddress, beaconParameters);

  const now2 = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
  beaconIdExpirationTimeStamp = now2 + 10;
  await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now2 + 1]);
  const encodedData2 = 456;
  encodedTimestamp2 = now2;
  const data2 = hre.ethers.utils.defaultAbiCoder.encode(['int256', 'uint256'], [encodedData2, encodedTimestamp2]);
  const signature2 = await airnodeWallet.signMessage(
    hre.ethers.utils.arrayify(
      hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId2, data2]))
    )
  );
  await airnodeRrp
    .connect(sponsorWallet)
    .fulfill(
      requestId2,
      airnodeAddress,
      rrpBeaconServer.address,
      rrpBeaconServer.interface.getSighash('fulfill'),
      data2,
      signature2,
      { gasLimit: 500000 }
    );

  selfServeRrpBeaconServerWhitelister = await selfServeRrpBeaconServerWhitelisterFactory.deploy(
    rrpBeaconServer.address
  );

  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  adminRole = await rrpBeaconServer.adminRole();
  await accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
    [managerRootRole, adminRole, adminRole],
    [
      rrpBeaconServerAdminRoleDescription,
      await rrpBeaconServer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
      await rrpBeaconServer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
    ],
    [
      roles.manager.address, // which will already have been granted the role
      selfServeRrpBeaconServerWhitelister.address,
      selfServeRrpBeaconServerWhitelister.address,
    ]
  );
});

describe('constructor', function () {
  context('RrpBeaconServer address is not zero', function () {
    it('constructs', async function () {
      const selfServeRrpBeaconServerWhitelisterFactory = await hre.ethers.getContractFactory(
        'SelfServeRrpBeaconServerWhitelister',
        roles.deployer
      );
      const selfServeRrpBeaconServerWhitelister = await selfServeRrpBeaconServerWhitelisterFactory.deploy(
        rrpBeaconServer.address
      );
      expect(await selfServeRrpBeaconServerWhitelister.rrpBeaconServer()).to.equal(rrpBeaconServer.address);
    });
  });
  context('RrpBeaconServer address is zero', function () {
    it('reverts', async function () {
      const selfServeRrpBeaconServerWhitelisterFactory = await hre.ethers.getContractFactory(
        'SelfServeRrpBeaconServerWhitelister',
        roles.deployer
      );
      await expect(
        selfServeRrpBeaconServerWhitelisterFactory.deploy(hre.ethers.constants.AddressZero)
      ).to.be.revertedWith('RrpBeaconServer address zero');
    });
  });
});

describe('setBeaconIdToExpirationTimestamp', function () {
  context('caller is owner', function () {
    it('sets the expiration timestamp for a beaconId', async function () {
      const randomBeaconId = hre.ethers.utils.randomBytes(32);
      expect(await selfServeRrpBeaconServerWhitelister.beaconIdToExpirationTimestamp(randomBeaconId)).to.equal(0);
      const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
      await expect(
        selfServeRrpBeaconServerWhitelister
          .connect(roles.manager)
          .setBeaconIdToExpirationTimestamp(randomBeaconId, now + 10)
      ).to.emit(selfServeRrpBeaconServerWhitelister, 'SetBeaconIdToExpirationTimestamp');

      expect(await selfServeRrpBeaconServerWhitelister.beaconIdToExpirationTimestamp(randomBeaconId)).to.equal(
        now + 10
      );
    });
  });
  context('caller is not owner', function () {
    it('reverts', async function () {
      const randomBeaconId = hre.ethers.utils.randomBytes(32);
      const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
      await expect(
        selfServeRrpBeaconServerWhitelister
          .connect(roles.randomPerson)
          .setBeaconIdToExpirationTimestamp(randomBeaconId, now + 10)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('setBeaconIdToIndefiniteWhitelistStatus', function () {
  context('caller is owner', function () {
    it('sets the indefinite whitelist status for a beaconId', async function () {
      const randomBeaconId = hre.ethers.utils.randomBytes(32);
      expect(await selfServeRrpBeaconServerWhitelister.beaconIdToIndefiniteWhitelistStatus(randomBeaconId)).to.equal(
        false
      );
      await expect(
        selfServeRrpBeaconServerWhitelister
          .connect(roles.manager)
          .setBeaconIdToIndefiniteWhitelistStatus(randomBeaconId, true)
      ).to.emit(selfServeRrpBeaconServerWhitelister, 'SetBeaconIdToIndefiniteWhitelistStatus');

      expect(await selfServeRrpBeaconServerWhitelister.beaconIdToIndefiniteWhitelistStatus(randomBeaconId)).to.equal(
        true
      );
    });
  });
  context('caller is not owner', function () {
    it('reverts', async function () {
      const randomBeaconId = hre.ethers.utils.randomBytes(32);
      await expect(
        selfServeRrpBeaconServerWhitelister
          .connect(roles.randomPerson)
          .setBeaconIdToIndefiniteWhitelistStatus(randomBeaconId, true)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('whitelistReader', function () {
  beforeEach(async function () {
    const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
    beaconIdExpirationTimeStamp = now + 10;
    await selfServeRrpBeaconServerWhitelister
      .connect(roles.manager)
      .setBeaconIdToExpirationTimestamp(beaconId, beaconIdExpirationTimeStamp);
    await selfServeRrpBeaconServerWhitelister
      .connect(roles.manager)
      .setBeaconIdToIndefiniteWhitelistStatus(beaconId2, true);
  });
  context('beaconId indefinite whitelist status is valid and beaconId expirationTimestamp is valid', function () {
    it('whitelists a reader', async function () {
      await selfServeRrpBeaconServerWhitelister
        .connect(roles.manager)
        .setBeaconIdToIndefiniteWhitelistStatus(beaconId, true);
      await expect(rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId)).to.be.revertedWith(
        'Sender not whitelisted'
      );
      let whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(
        beaconId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(selfServeRrpBeaconServerWhitelister.whitelistReader(beaconId, roles.beaconReader.address))
        .to.emit(selfServeRrpBeaconServerWhitelister, 'WhitelistedReader')
        .withArgs(beaconId, roles.beaconReader.address, beaconIdExpirationTimeStamp, true);
      whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(beaconIdExpirationTimeStamp);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);

      const beaconResponse = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId);
      expect(beaconResponse.value).to.equal(123);
      expect(beaconResponse.timestamp).to.equal(encodedTimestamp);
    });
  });
  context('beaconId indefinite whitelist status is invalid and beaconId expirationTimestamp is valid', function () {
    it('whitelists a reader', async function () {
      await expect(rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId)).to.be.revertedWith(
        'Sender not whitelisted'
      );
      let whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(
        beaconId,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(selfServeRrpBeaconServerWhitelister.whitelistReader(beaconId, roles.beaconReader.address))
        .to.emit(selfServeRrpBeaconServerWhitelister, 'WhitelistedReader')
        .withArgs(beaconId, roles.beaconReader.address, beaconIdExpirationTimeStamp, false);
      whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(beaconIdExpirationTimeStamp);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

      const beaconResponse = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId);
      expect(beaconResponse.value).to.equal(123);
      expect(beaconResponse.timestamp).to.equal(encodedTimestamp);
    });
  });
  context('beaconId indefinite whitelist status is valid and beaconId expirationTimestamp is invalid', function () {
    it('whitelists a reader', async function () {
      await expect(rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId2)).to.be.revertedWith(
        'Sender not whitelisted'
      );

      let whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(
        beaconId2,
        roles.beaconReader.address
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(selfServeRrpBeaconServerWhitelister.whitelistReader(beaconId2, roles.beaconReader.address))
        .to.emit(selfServeRrpBeaconServerWhitelister, 'WhitelistedReader')
        .withArgs(beaconId2, roles.beaconReader.address, 0, true);
      whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId2, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);

      const beaconResponse = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId2);
      expect(beaconResponse.value).to.equal(456);
      expect(beaconResponse.timestamp).to.equal(encodedTimestamp2);
    });
  });

  context('beaconId indefinite whitelist status is invalid and beaconId expirationTimestamp is invalid', function () {
    it('reverts', async function () {
      const randomBeaconId = hre.ethers.utils.randomBytes(32);
      await expect(
        selfServeRrpBeaconServerWhitelister.whitelistReader(randomBeaconId, roles.beaconReader.address)
      ).to.be.revertedWith('Cannot whitelist');
    });
  });
});
