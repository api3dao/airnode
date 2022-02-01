/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let dapiServer1, dapiServer2, dapiReader;
let dapiServerAdminRoleDescription = 'DapiServer admin';
let beaconId, beaconValue, beaconTimestamp;
const name = hre.ethers.utils.formatBytes32String('My beacon');

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    nameSetter: accounts[2],
    airnode: accounts[3],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  const accessControlRegistry = await accessControlRegistryFactory.deploy();
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  const airnodeProtocol = await airnodeProtocolFactory.deploy();
  const dapiServerFactory = await hre.ethers.getContractFactory('DapiServer', roles.deployer);
  dapiServer1 = await dapiServerFactory.deploy(
    accessControlRegistry.address,
    dapiServerAdminRoleDescription,
    roles.manager.address,
    airnodeProtocol.address
  );
  dapiServer2 = await dapiServerFactory.deploy(
    accessControlRegistry.address,
    dapiServerAdminRoleDescription,
    roles.manager.address,
    airnodeProtocol.address
  );
  const dapiReaderFactory = await hre.ethers.getContractFactory('MockDapiReader', roles.deployer);
  dapiReader = await dapiReaderFactory.deploy(dapiServer1.address);
  const airnodeData = testUtils.generateRandomAirnodeWallet();
  const airnodeAddress = airnodeData.airnodeAddress;
  const airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeData.airnodeMnemonic, "m/44'/60'/0'/0/0");
  const endpointId = testUtils.generateRandomBytes32();
  const templateParameters = testUtils.generateRandomBytes();
  const templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [endpointId, templateParameters])
  );
  beaconId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32'], [airnodeAddress, templateId])
  );
  await dapiServer1.connect(roles.manager).setName(name, beaconId);
  beaconValue = 123;
  beaconTimestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
  const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [beaconValue]);
  const signature = await airnodeWallet.signMessage(
    hre.ethers.utils.arrayify(
      hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [templateId, beaconTimestamp, data])
      )
    )
  );
  await hre.ethers.provider.send('evm_setNextBlockTimestamp', [beaconTimestamp + 1]);
  await dapiServer1.updateBeaconWithSignedData(airnodeAddress, templateId, beaconTimestamp, data, signature);
});

describe('constructor', function () {
  it('constructs', async function () {
    expect(await dapiReader.dapiServer()).to.equal(dapiServer1.address);
  });
});

describe('setDapiServer', function () {
  context('DapiServer address is not zero', function () {
    it('sets DapiServer address', async function () {
      await dapiReader.exposedSetDapiServer(dapiServer2.address);
      expect(await dapiReader.dapiServer()).to.equal(dapiServer2.address);
    });
  });
  context('DapiServer address is zero', function () {
    it('reverts', async function () {
      await expect(dapiReader.exposedSetDapiServer(hre.ethers.constants.AddressZero)).to.be.revertedWith(
        'dAPI server address zero'
      );
    });
  });
});

describe('readWithDataPointId', function () {
  context('DapiReader is whitelisted', function () {
    it('reads with data point ID', async function () {
      await dapiServer1.connect(roles.manager).setIndefiniteWhitelistStatus(beaconId, dapiReader.address, true);
      const dataPoint = await dapiReader.exposedReadWithDataPointId(beaconId);
      expect(dataPoint.value).to.equal(beaconValue);
      expect(dataPoint.timestamp).to.equal(beaconTimestamp);
    });
  });
  context('DapiReader is not whitelisted', function () {
    it('reads with data point ID', async function () {
      await expect(dapiReader.exposedReadWithDataPointId(beaconId)).to.be.revertedWith('Sender cannot read');
    });
  });
});

describe('readWithName', function () {
  context('DapiReader is whitelisted', function () {
    it('reads with name', async function () {
      const nameHash = hre.ethers.utils.keccak256(hre.ethers.utils.defaultAbiCoder.encode(['bytes32'], [name]));
      await dapiServer1.connect(roles.manager).setIndefiniteWhitelistStatus(nameHash, dapiReader.address, true);
      const dataPoint = await dapiReader.exposedReadWithName(name);
      expect(dataPoint.value).to.equal(beaconValue);
      expect(dataPoint.timestamp).to.equal(beaconTimestamp);
    });
  });
  context('DapiReader is not whitelisted', function () {
    it('reads with data point ID', async function () {
      await expect(dapiReader.exposedReadWithName(name)).to.be.revertedWith('Sender cannot read');
    });
  });
});
