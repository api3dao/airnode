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
    rrpBeaconServer.address,
    [beaconId],
    [beaconIdExpirationTimeStamp],
    [beaconId2],
    [true]
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
      const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
      const selfServeRrpBeaconServerWhitelister = await selfServeRrpBeaconServerWhitelisterFactory.deploy(
        rrpBeaconServer.address,
        [beaconId],
        [now + 10],
        [beaconId2],
        [true]
      );
      expect(await selfServeRrpBeaconServerWhitelister.rrpBeaconServer()).to.equal(rrpBeaconServer.address);
      expect(await selfServeRrpBeaconServerWhitelister.beaconIdToExpirationTimestamp(beaconId)).to.equal(now + 10);
      expect(await selfServeRrpBeaconServerWhitelister.beaconIdToIndefiniteWhitelistStatus(beaconId2)).to.equal(true);
    });
  });
  context('RrpBeaconServer address is zero', function () {
    it('reverts', async function () {
      const selfServeRrpBeaconServerWhitelisterFactory = await hre.ethers.getContractFactory(
        'SelfServeRrpBeaconServerWhitelister',
        roles.deployer
      );
      const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
      await expect(
        selfServeRrpBeaconServerWhitelisterFactory.deploy(
          hre.ethers.constants.AddressZero,
          [beaconId],
          [now + 10],
          [beaconId2],
          [true]
        )
      ).to.be.revertedWith('RrpBeaconServer address zero');
    });
  });
});

describe('setBeaconIdWithExpirationTimestamp', function () {
  context('caller is owner', function () {
    it('sets the expiration timestamp for a beaconId', async function () {
      const randomBeaconId = hre.ethers.utils.randomBytes(32);
      expect(await selfServeRrpBeaconServerWhitelister.beaconIdToExpirationTimestamp(randomBeaconId)).to.equal(0);
      const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
      await expect(
        selfServeRrpBeaconServerWhitelister
          .connect(roles.manager)
          .setBeaconIdWithExpirationTimestamp(randomBeaconId, now + 10)
      ).to.emit(selfServeRrpBeaconServerWhitelister, 'SetBeaconIdWithExpirationTimestamp');

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
          .setBeaconIdWithExpirationTimestamp(randomBeaconId, now + 10)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('setBeaconIdWithIndefiniteWhitelistStatus', function () {
  context('caller is owner', function () {
    it('sets the indefinite whitelist status for a beaconId', async function () {
      const randomBeaconId = hre.ethers.utils.randomBytes(32);
      expect(await selfServeRrpBeaconServerWhitelister.beaconIdToIndefiniteWhitelistStatus(randomBeaconId)).to.equal(
        false
      );
      await expect(
        selfServeRrpBeaconServerWhitelister
          .connect(roles.manager)
          .setBeaconIdWithIndefiniteWhitelistStatus(randomBeaconId, true)
      ).to.emit(selfServeRrpBeaconServerWhitelister, 'SetBeaconIdWithIndefiniteWhitelistStatus');

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
          .setBeaconIdWithIndefiniteWhitelistStatus(randomBeaconId, true)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('whitelistReaderWithExpiration', function () {
  context('beaconId expirationTimestamp is valid', function () {
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
      await expect(
        selfServeRrpBeaconServerWhitelister.whitelistReaderWithExpiration(beaconId, roles.beaconReader.address)
      )
        .to.emit(selfServeRrpBeaconServerWhitelister, 'WhitelistedReaderWithExpiration')
        .withArgs(beaconId, roles.beaconReader.address);
      whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(beaconIdExpirationTimeStamp);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

      const beaconResponse = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId);
      expect(beaconResponse.value).to.equal(123);
      expect(beaconResponse.timestamp).to.equal(encodedTimestamp);
    });
  });
  context('beaconId expirationTimestamp is invalid', function () {
    it('reverts', async function () {
      const randomBeaconId = hre.ethers.utils.randomBytes(32);
      await expect(
        selfServeRrpBeaconServerWhitelister.whitelistReaderWithExpiration(randomBeaconId, roles.beaconReader.address)
      ).to.be.revertedWith('Cannot whitelist for beacon');
    });
  });
});

describe('whitelistReaderIndefinitely', function () {
  context('beaconId indefinite whitelist status is valid', function () {
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
      await expect(
        selfServeRrpBeaconServerWhitelister.whitelistReaderIndefinitely(beaconId2, roles.beaconReader.address)
      )
        .to.emit(selfServeRrpBeaconServerWhitelister, 'WhitelistedReaderIndefinitely')
        .withArgs(beaconId2, roles.beaconReader.address);
      whitelistStatus = await rrpBeaconServer.beaconIdToReaderToWhitelistStatus(beaconId2, roles.beaconReader.address);
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);

      const beaconResponse = await rrpBeaconServer.connect(roles.beaconReader).readBeacon(beaconId2);
      expect(beaconResponse.value).to.equal(456);
      expect(beaconResponse.timestamp).to.equal(encodedTimestamp2);
    });
  });
  context('beaconId indefinite whitelist status is invalid', function () {
    it('reverts', async function () {
      const randomBeaconId = hre.ethers.utils.randomBytes(32);
      await expect(
        selfServeRrpBeaconServerWhitelister.whitelistReaderIndefinitely(randomBeaconId, roles.beaconReader.address)
      ).to.be.revertedWith('Cannot whitelist indefinitely for beacon');
    });
  });
});
