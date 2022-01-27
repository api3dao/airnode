/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry, airnodeProtocol, dapiServer;
let dapiServerAdminRoleDescription = 'DapiServer admin';
let indefiniteWhitelisterRole, unlimitedReaderRole, nameSetterRole;
let airnodeAddress, airnodeWallet, relayerAddress;
let airnodeRrpSponsorWallet, airnodePspSponsorWallet, relayerRrpSponsorWallet, relayerPspSponsorWallet;
let voidSignerAddressZero;
let endpointId, templateParameters, templateId;
let beaconParameters, beaconId;
let beaconUpdateSubscriptionId,
  beaconUpdateSubscriptionRelayedId,
  beaconUpdateSubscriptionConditionParameters,
  beaconUpdateSubscriptionConditions;
let dapiBeaconParameters = [],
  dapiBeaconIds = [],
  dapiId;
let dapiUpdateSubscriptionId, dapiUpdateSubscriptionRelayedId, dapiUpdateSubscriptionConditionParameters;

async function deployContracts() {
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  const dapiServerFactory = await hre.ethers.getContractFactory('DapiServer', roles.deployer);
  dapiServer = await dapiServerFactory.deploy(
    accessControlRegistry.address,
    dapiServerAdminRoleDescription,
    roles.manager.address,
    airnodeProtocol.address
  );
}

async function setUpRoles() {
  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  // Initialize the roles and grant them to respective accounts
  const adminRole = await dapiServer.adminRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(managerRootRole, dapiServerAdminRoleDescription);
  const whitelistExpirationExtenderRole = await dapiServer.whitelistExpirationExtenderRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(adminRole, await dapiServer.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION());
  await accessControlRegistry
    .connect(roles.manager)
    .grantRole(whitelistExpirationExtenderRole, roles.whitelistExpirationExtender.address);
  const whitelistExpirationSetterRole = await dapiServer.whitelistExpirationSetterRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(adminRole, await dapiServer.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION());
  await accessControlRegistry
    .connect(roles.manager)
    .grantRole(whitelistExpirationSetterRole, roles.whitelistExpirationSetter.address);
  indefiniteWhitelisterRole = await dapiServer.indefiniteWhitelisterRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(adminRole, await dapiServer.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION());
  await accessControlRegistry
    .connect(roles.manager)
    .grantRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address);
  unlimitedReaderRole = await dapiServer.unlimitedReaderRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(adminRole, await dapiServer.UNLIMITED_READER_ROLE_DESCRIPTION());
  await accessControlRegistry.connect(roles.manager).grantRole(unlimitedReaderRole, roles.unlimitedReader.address);
  nameSetterRole = await dapiServer.nameSetterRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(adminRole, await dapiServer.NAME_SETTER_ROLE_DESCRIPTION());
  await accessControlRegistry.connect(roles.manager).grantRole(nameSetterRole, roles.nameSetter.address);

  await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
  await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
}

async function setUpSponsorWallets() {
  let airnodeMnemonic;
  ({ airnodeAddress, airnodeMnemonic } = testUtils.generateRandomAirnodeWallet());
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
  const relayerData = testUtils.generateRandomAirnodeWallet();
  relayerAddress = relayerData.airnodeAddress;
  const relayerMnemonic = relayerData.airnodeMnemonic;
  airnodeRrpSponsorWallet = testUtils
    .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address, 1)
    .connect(hre.ethers.provider);
  relayerRrpSponsorWallet = testUtils
    .deriveSponsorWallet(relayerMnemonic, roles.sponsor.address, 2)
    .connect(hre.ethers.provider);
  airnodePspSponsorWallet = testUtils
    .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address, 3)
    .connect(hre.ethers.provider);
  relayerPspSponsorWallet = testUtils
    .deriveSponsorWallet(relayerMnemonic, roles.sponsor.address, 4)
    .connect(hre.ethers.provider);
  await roles.deployer.sendTransaction({
    to: airnodeRrpSponsorWallet.address,
    value: hre.ethers.utils.parseEther('1'),
  });
  await roles.deployer.sendTransaction({
    to: relayerRrpSponsorWallet.address,
    value: hre.ethers.utils.parseEther('1'),
  });
  await roles.deployer.sendTransaction({
    to: airnodePspSponsorWallet.address,
    value: hre.ethers.utils.parseEther('1'),
  });
  await roles.deployer.sendTransaction({
    to: relayerPspSponsorWallet.address,
    value: hre.ethers.utils.parseEther('1'),
  });
  voidSignerAddressZero = new hre.ethers.VoidSigner(hre.ethers.constants.AddressZero, hre.ethers.provider);
}

async function setUpTemplate() {
  endpointId = testUtils.generateRandomBytes32();
  templateParameters = testUtils.generateRandomBytes();
  await airnodeProtocol.connect(roles.randomPerson).storeTemplate(airnodeAddress, endpointId, templateParameters);
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, templateParameters])
  );
}

async function setUpBeacon() {
  beaconParameters = testUtils.generateRandomBytes();
  beaconId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, beaconParameters])
  );
  // Update threshold is 10%
  beaconUpdateSubscriptionConditionParameters = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256'],
    [(await dapiServer.HUNDRED_PERCENT()).div(10)]
  );
  // Create Beacon update conditions using Airnode ABI
  beaconUpdateSubscriptionConditions = hre.ethers.utils.defaultAbiCoder.encode(
    ['bytes32', 'bytes32', 'uint256', 'bytes32', 'address', 'bytes32', 'bytes32', 'bytes32', 'bytes'],
    [
      hre.ethers.utils.formatBytes32String('1uabB'),
      hre.ethers.utils.formatBytes32String('_conditionChainId'),
      (await hre.ethers.provider.getNetwork()).chainId,
      hre.ethers.utils.formatBytes32String('_conditionAddress'),
      dapiServer.address,
      hre.ethers.utils.formatBytes32String('_conditionFunctionId'),
      hre.ethers.utils.defaultAbiCoder.encode(
        ['bytes4'],
        [dapiServer.interface.getSighash('conditionPspBeaconUpdate')]
      ),
      hre.ethers.utils.formatBytes32String('_conditionParameters'),
      beaconUpdateSubscriptionConditionParameters,
    ]
  );
  // Register the Beacon update subscription
  beaconUpdateSubscriptionId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'bytes32', 'bytes', 'bytes', 'address', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        templateId,
        beaconParameters,
        beaconUpdateSubscriptionConditions,
        airnodeAddress,
        roles.sponsor.address,
        dapiServer.address,
        dapiServer.interface.getSighash('fulfillPspBeaconUpdate'),
      ]
    )
  );
  await dapiServer
    .connect(roles.randomPerson)
    .registerBeaconUpdateSubscription(
      templateId,
      beaconParameters,
      beaconUpdateSubscriptionConditions,
      airnodeAddress,
      roles.sponsor.address
    );
  // Register the relayed Beacon update subscription
  beaconUpdateSubscriptionRelayedId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'bytes32', 'bytes', 'bytes', 'address', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        templateId,
        beaconParameters,
        beaconUpdateSubscriptionConditions,
        relayerAddress,
        roles.sponsor.address,
        dapiServer.address,
        dapiServer.interface.getSighash('fulfillPspBeaconUpdate'),
      ]
    )
  );
  await dapiServer
    .connect(roles.randomPerson)
    .registerBeaconUpdateSubscription(
      templateId,
      beaconParameters,
      beaconUpdateSubscriptionConditions,
      relayerAddress,
      roles.sponsor.address
    );
}

async function setUpDapi() {
  for (let ind = 0; ind < 3; ind++) {
    const dapiBeaconParameter = testUtils.generateRandomBytes();
    const dapiBeaconId = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, dapiBeaconParameter])
    );
    dapiBeaconParameters[ind] = dapiBeaconParameter;
    dapiBeaconIds[ind] = dapiBeaconId;
  }
  dapiId = hre.ethers.utils.keccak256(hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [dapiBeaconIds]));
  // Update threshold is 5%
  dapiUpdateSubscriptionConditionParameters = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256'],
    [(await dapiServer.HUNDRED_PERCENT()).div(20)]
  );
  // Create dAPI update conditions using Airnode ABI
  const dapiUpdateSubscriptionConditions = hre.ethers.utils.defaultAbiCoder.encode(
    ['bytes32', 'bytes32', 'uint256', 'bytes32', 'address', 'bytes32', 'bytes32', 'bytes32', 'bytes'],
    [
      hre.ethers.utils.formatBytes32String('1uabB'),
      hre.ethers.utils.formatBytes32String('_conditionChainId'),
      (await hre.ethers.provider.getNetwork()).chainId,
      hre.ethers.utils.formatBytes32String('_conditionAddress'),
      dapiServer.address,
      hre.ethers.utils.formatBytes32String('_conditionFunctionId'),
      hre.ethers.utils.defaultAbiCoder.encode(['bytes4'], [dapiServer.interface.getSighash('conditionPspDapiUpdate')]),
      hre.ethers.utils.formatBytes32String('_conditionParameters'),
      dapiUpdateSubscriptionConditionParameters,
    ]
  );
  // Create and store the dAPI update template
  await airnodeProtocol.connect(roles.randomPerson).storeTemplate(airnodeAddress, hre.ethers.constants.HashZero, '0x');
  const dapiUpdateTemplateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['address', 'bytes32', 'bytes'],
      [airnodeAddress, hre.ethers.constants.HashZero, '0x']
    )
  );
  // Calculate the dAPI update subscription ID
  const dapiUpdateParameters = hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [dapiBeaconIds]);
  dapiUpdateSubscriptionId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'bytes32', 'bytes', 'bytes', 'address', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeProtocol.address,
        dapiUpdateTemplateId,
        dapiUpdateParameters,
        dapiUpdateSubscriptionConditions,
        airnodeAddress,
        roles.sponsor.address,
        dapiServer.address,
        dapiServer.interface.getSighash('fulfillPspDapiUpdate'),
      ]
    )
  );
  dapiUpdateSubscriptionRelayedId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'bytes32', 'bytes', 'bytes', 'address', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeProtocol.address,
        dapiUpdateTemplateId,
        dapiUpdateParameters,
        dapiUpdateSubscriptionConditionParameters,
        relayerAddress,
        roles.sponsor.address,
        dapiServer.address,
        dapiServer.interface.getSighash('fulfillPspDapiUpdate'),
      ]
    )
  );
}

function encodeData(decodedData) {
  return hre.ethers.utils.defaultAbiCoder.encode(['int256'], [decodedData]);
}

async function encodeAndSignFulfillment(decodedData, requestOrSubscriptionId, timestamp, sponsorWalletAddress) {
  const signature = await airnodeWallet.signMessage(
    hre.ethers.utils.arrayify(
      hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['bytes32', 'uint256', 'address'],
          [requestOrSubscriptionId, timestamp, sponsorWalletAddress]
        )
      )
    )
  );
  return [encodeData(decodedData), signature];
}

async function encodeAndSignFulfillmentRelayed(decodedData, requestOrSubscriptionId, timestamp, sponsorWalletAddress) {
  const data = encodeData(decodedData);
  const signature = await airnodeWallet.signMessage(
    hre.ethers.utils.arrayify(
      hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['bytes32', 'uint256', 'address', 'bytes'],
          [requestOrSubscriptionId, timestamp, sponsorWalletAddress, data]
        )
      )
    )
  );
  return [data, signature];
}

async function encodeAndSignData(decodedData, requestHash, timestamp) {
  const data = encodeData(decodedData);
  const signature = await airnodeWallet.signMessage(
    hre.ethers.utils.arrayify(
      hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [requestHash, timestamp, data])
      )
    )
  );
  return [data, signature];
}

async function deriveRegularRequestId() {
  return hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'address', 'uint256', 'bytes32', 'bytes', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeProtocol.address,
        dapiServer.address,
        await airnodeProtocol.requesterToRequestCountPlusOne(dapiServer.address),
        templateId,
        beaconParameters,
        roles.sponsor.address,
        dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
      ]
    )
  );
}

async function deriveRelayedRequestId() {
  return hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'address', 'uint256', 'bytes32', 'bytes', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeProtocol.address,
        dapiServer.address,
        await airnodeProtocol.requesterToRequestCountPlusOne(dapiServer.address),
        templateId,
        beaconParameters,
        relayerAddress,
        roles.sponsor.address,
        dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
      ]
    )
  );
}

async function setBeacon(templateId, beaconParameters, decodedData, timestamp) {
  const beaconIdToBeSet = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, beaconParameters])
  );
  const [data, signature] = await encodeAndSignData(decodedData, beaconIdToBeSet, timestamp);
  await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
  await dapiServer
    .connect(roles.randomPerson)
    .updateBeaconWithSignedData(templateId, beaconParameters, timestamp, data, signature);
}

async function setDapi(templateId, dapiBeaconParameters, decodedData, timestamps) {
  const dataArray = [];
  const signatureArray = [];
  for (let ind = 0; ind < decodedData.length; ind++) {
    const [data, signature] = await encodeAndSignData(decodedData[ind], dapiBeaconIds[ind], timestamps[ind]);
    dataArray.push(data);
    signatureArray.push(signature);
  }
  await hre.ethers.provider.send('evm_setNextBlockTimestamp', [Math.max(...timestamps)]);
  await dapiServer.updateDapiWithSignedData(
    Array(3).fill(templateId),
    dapiBeaconParameters,
    timestamps,
    dataArray,
    signatureArray
  );
}

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    whitelistExpirationExtender: accounts[2],
    whitelistExpirationSetter: accounts[3],
    indefiniteWhitelister: accounts[4],
    unlimitedReader: accounts[5],
    nameSetter: accounts[6],
    sponsor: accounts[7],
    updateRequester: accounts[8],
    beaconReader: accounts[9],
    randomPerson: accounts[10],
  };
  await deployContracts();
  await setUpRoles();
  await setUpSponsorWallets();
  await setUpTemplate();
  await setUpBeacon();
  await setUpDapi();
});

describe('extendWhitelistExpiration', function () {
  context('Sender has whitelist expiration extender role', function () {
    context('Data point ID is not zero', function () {
      context('Reader address is not zero', function () {
        context('Timestamp extends whitelist expiration', function () {
          it('extends whitelist expiration', async function () {
            const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
            await expect(
              dapiServer
                .connect(roles.whitelistExpirationExtender)
                .extendWhitelistExpiration(beaconId, roles.beaconReader.address, timestamp)
            )
              .to.emit(dapiServer, 'ExtendedWhitelistExpiration')
              .withArgs(beaconId, roles.beaconReader.address, roles.whitelistExpirationExtender.address, timestamp);
            const whitelistStatus = await dapiServer.dataPointIdToReaderToWhitelistStatus(
              beaconId,
              roles.beaconReader.address
            );
            expect(whitelistStatus.expirationTimestamp).to.equal(timestamp);
            expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          });
        });
        context('Timestamp does not extend whitelist expiration', function () {
          it('reverts', async function () {
            await expect(
              dapiServer
                .connect(roles.whitelistExpirationExtender)
                .extendWhitelistExpiration(beaconId, roles.beaconReader.address, 0)
            ).to.be.revertedWith('Does not extend expiration');
          });
        });
      });
      context('Reader address is zero', function () {
        it('reverts', async function () {
          const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
          await expect(
            dapiServer
              .connect(roles.whitelistExpirationExtender)
              .extendWhitelistExpiration(beaconId, hre.ethers.constants.AddressZero, timestamp)
          ).to.be.revertedWith('User address zero');
        });
      });
    });
    context('Data point ID is zero', function () {
      it('reverts', async function () {
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await expect(
          dapiServer
            .connect(roles.whitelistExpirationExtender)
            .extendWhitelistExpiration(hre.ethers.constants.HashZero, roles.beaconReader.address, timestamp)
        ).to.be.revertedWith('Service ID zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Data point ID is not zero', function () {
      context('Reader address is not zero', function () {
        context('Timestamp extends whitelist expiration', function () {
          it('extends whitelist expiration', async function () {
            const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
            await expect(
              dapiServer
                .connect(roles.manager)
                .extendWhitelistExpiration(beaconId, roles.beaconReader.address, timestamp)
            )
              .to.emit(dapiServer, 'ExtendedWhitelistExpiration')
              .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, timestamp);
            const whitelistStatus = await dapiServer.dataPointIdToReaderToWhitelistStatus(
              beaconId,
              roles.beaconReader.address
            );
            expect(whitelistStatus.expirationTimestamp).to.equal(timestamp);
            expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
          });
        });
        context('Timestamp does not extend whitelist expiration', function () {
          it('reverts', async function () {
            await expect(
              dapiServer.connect(roles.manager).extendWhitelistExpiration(beaconId, roles.beaconReader.address, 0)
            ).to.be.revertedWith('Does not extend expiration');
          });
        });
      });
      context('Reader address is zero', function () {
        it('reverts', async function () {
          const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
          await expect(
            dapiServer
              .connect(roles.manager)
              .extendWhitelistExpiration(beaconId, hre.ethers.constants.AddressZero, timestamp)
          ).to.be.revertedWith('User address zero');
        });
      });
    });
    context('Data point ID is zero', function () {
      it('reverts', async function () {
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await expect(
          dapiServer
            .connect(roles.manager)
            .extendWhitelistExpiration(hre.ethers.constants.HashZero, roles.beaconReader.address, timestamp)
        ).to.be.revertedWith('Service ID zero');
      });
    });
  });
  context('Sender does not have the whitelist extender role and is not the manager', function () {
    it('reverts', async function () {
      const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .extendWhitelistExpiration(beaconId, roles.beaconReader.address, timestamp)
      ).to.be.revertedWith('Cannot extend expiration');
    });
  });
});

describe('setWhitelistExpiration', function () {
  context('Sender has whitelist expiration setter role', function () {
    context('Data point ID is not zero', function () {
      context('Reader address is not zero', function () {
        it('sets whitelist expiration', async function () {
          await expect(
            dapiServer
              .connect(roles.whitelistExpirationSetter)
              .setWhitelistExpiration(beaconId, roles.beaconReader.address, 123)
          )
            .to.emit(dapiServer, 'SetWhitelistExpiration')
            .withArgs(beaconId, roles.beaconReader.address, roles.whitelistExpirationSetter.address, 123);
          const whitelistStatus = await dapiServer.dataPointIdToReaderToWhitelistStatus(
            beaconId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(123);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        });
      });
      context('Reader address is zero', function () {
        it('reverts', async function () {
          await expect(
            dapiServer
              .connect(roles.whitelistExpirationSetter)
              .setWhitelistExpiration(beaconId, hre.ethers.constants.AddressZero, 123)
          ).to.be.revertedWith('User address zero');
        });
      });
    });
    context('Data point ID is zero', function () {
      it('reverts', async function () {
        await expect(
          dapiServer
            .connect(roles.whitelistExpirationSetter)
            .setWhitelistExpiration(hre.ethers.constants.HashZero, roles.beaconReader.address, 123)
        ).to.be.revertedWith('Service ID zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Data point ID is not zero', function () {
      context('Reader address is not zero', function () {
        it('sets whitelist expiration', async function () {
          await expect(
            dapiServer.connect(roles.manager).setWhitelistExpiration(beaconId, roles.beaconReader.address, 123)
          )
            .to.emit(dapiServer, 'SetWhitelistExpiration')
            .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, 123);
          const whitelistStatus = await dapiServer.dataPointIdToReaderToWhitelistStatus(
            beaconId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(123);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        });
      });
      context('Reader address is zero', function () {
        it('reverts', async function () {
          await expect(
            dapiServer.connect(roles.manager).setWhitelistExpiration(beaconId, hre.ethers.constants.AddressZero, 123)
          ).to.be.revertedWith('User address zero');
        });
      });
    });
    context('Data point ID is zero', function () {
      it('reverts', async function () {
        await expect(
          dapiServer
            .connect(roles.manager)
            .setWhitelistExpiration(hre.ethers.constants.HashZero, roles.beaconReader.address, 123)
        ).to.be.revertedWith('Service ID zero');
      });
    });
  });
  context('Sender does not have the whitelist setter role and is not the manager', function () {
    it('reverts', async function () {
      await expect(
        dapiServer.connect(roles.beaconReader).setWhitelistExpiration(beaconId, roles.beaconReader.address, 123)
      ).to.be.revertedWith('Cannot set expiration');
    });
  });
});

describe('setIndefiniteWhitelistStatus', function () {
  context('Sender has indefinite whitelister setter role', function () {
    context('Data point ID is not zero', function () {
      context('Reader address is not zero', function () {
        it('sets indefinite whitelist status', async function () {
          await expect(
            dapiServer
              .connect(roles.indefiniteWhitelister)
              .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
          )
            .to.emit(dapiServer, 'SetIndefiniteWhitelistStatus')
            .withArgs(beaconId, roles.beaconReader.address, roles.indefiniteWhitelister.address, true, 1);
          const whitelistStatus = await dapiServer.dataPointIdToReaderToWhitelistStatus(
            beaconId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          expect(
            await dapiServer.dataPointIdToReaderToSetterToIndefiniteWhitelistStatus(
              beaconId,
              roles.beaconReader.address,
              roles.indefiniteWhitelister.address
            )
          ).to.equal(true);
        });
      });
      context('Reader address is zero', function () {
        it('reverts', async function () {
          await expect(
            dapiServer
              .connect(roles.indefiniteWhitelister)
              .setIndefiniteWhitelistStatus(beaconId, hre.ethers.constants.AddressZero, true)
          ).to.be.revertedWith('User address zero');
        });
      });
    });
    context('Data point ID is zero', function () {
      it('reverts', async function () {
        await expect(
          dapiServer
            .connect(roles.indefiniteWhitelister)
            .setIndefiniteWhitelistStatus(hre.ethers.constants.HashZero, roles.beaconReader.address, true)
        ).to.be.revertedWith('Service ID zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Data point ID is not zero', function () {
      context('Reader address is not zero', function () {
        it('sets indefinite whitelist status', async function () {
          await expect(
            dapiServer.connect(roles.manager).setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
          )
            .to.emit(dapiServer, 'SetIndefiniteWhitelistStatus')
            .withArgs(beaconId, roles.beaconReader.address, roles.manager.address, true, 1);
          const whitelistStatus = await dapiServer.dataPointIdToReaderToWhitelistStatus(
            beaconId,
            roles.beaconReader.address
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          expect(
            await dapiServer.dataPointIdToReaderToSetterToIndefiniteWhitelistStatus(
              beaconId,
              roles.beaconReader.address,
              roles.manager.address
            )
          ).to.equal(true);
        });
      });
      context('Reader address is zero', function () {
        it('reverts', async function () {
          await expect(
            dapiServer
              .connect(roles.manager)
              .setIndefiniteWhitelistStatus(beaconId, hre.ethers.constants.AddressZero, true)
          ).to.be.revertedWith('User address zero');
        });
      });
    });
    context('Data point ID is zero', function () {
      it('reverts', async function () {
        await expect(
          dapiServer
            .connect(roles.manager)
            .setIndefiniteWhitelistStatus(hre.ethers.constants.HashZero, roles.beaconReader.address, true)
        ).to.be.revertedWith('Service ID zero');
      });
    });
  });
  context('Sender does not have the indefinite whitelister role and is not the manager', function () {
    it('reverts', async function () {
      await expect(
        dapiServer.connect(roles.randomPerson).setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true)
      ).to.be.revertedWith('Cannot set indefinite status');
    });
  });
});

describe('revokeIndefiniteWhitelistStatus', function () {
  context('setter does not have the indefinite whitelister role', function () {
    context('setter is not the manager address', function () {
      it('revokes indefinite whitelist status', async function () {
        // Grant indefinite whitelist status
        await dapiServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
        // Revoke the indefinite whitelister role
        await accessControlRegistry
          .connect(roles.manager)
          .revokeRole(indefiniteWhitelisterRole, roles.indefiniteWhitelister.address);
        // Revoke the indefinite whitelist status
        await expect(
          dapiServer
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, roles.indefiniteWhitelister.address)
        )
          .to.emit(dapiServer, 'RevokedIndefiniteWhitelistStatus')
          .withArgs(
            beaconId,
            roles.beaconReader.address,
            roles.indefiniteWhitelister.address,
            roles.randomPerson.address,
            0
          );
        const whitelistStatus = await dapiServer.dataPointIdToReaderToWhitelistStatus(
          beaconId,
          roles.beaconReader.address
        );
        expect(whitelistStatus.expirationTimestamp).to.equal(0);
        expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        expect(
          await dapiServer.dataPointIdToReaderToSetterToIndefiniteWhitelistStatus(
            beaconId,
            roles.beaconReader.address,
            roles.indefiniteWhitelister.address
          )
        ).to.equal(false);
        // Revoking twice should not emit an event
        await expect(
          dapiServer
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, roles.indefiniteWhitelister.address)
        ).to.not.emit(dapiServer, 'RevokedIndefiniteWhitelistStatus');
      });
    });
    context('setter is the manager address', function () {
      it('reverts', async function () {
        await accessControlRegistry
          .connect(roles.manager)
          .renounceRole(indefiniteWhitelisterRole, roles.manager.address);
        await expect(
          dapiServer
            .connect(roles.randomPerson)
            .revokeIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, roles.manager.address)
        ).to.be.revertedWith('setter can set indefinite status');
      });
    });
  });
  context('setter has the indefinite whitelister role', function () {
    it('reverts', async function () {
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .revokeIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, roles.indefiniteWhitelister.address)
      ).to.be.revertedWith('setter can set indefinite status');
    });
  });
});

describe('constructor', function () {
  it('constructs', async function () {
    expect(await dapiServer.UNLIMITED_READER_ROLE_DESCRIPTION()).to.equal('Unlimited reader');
    expect(await dapiServer.NAME_SETTER_ROLE_DESCRIPTION()).to.equal('Name setter');
    expect(await dapiServer.HUNDRED_PERCENT()).to.equal(Math.pow(10, 8));
    expect(await dapiServer.accessControlRegistry()).to.equal(accessControlRegistry.address);
    expect(await dapiServer.adminRoleDescription()).to.equal(dapiServerAdminRoleDescription);
    expect(await dapiServer.manager()).to.equal(roles.manager.address);
    expect(await dapiServer.airnodeProtocol()).to.equal(airnodeProtocol.address);
    expect(await dapiServer.unlimitedReaderRole()).to.equal(unlimitedReaderRole);
    expect(await dapiServer.nameSetterRole()).to.equal(nameSetterRole);
  });
});

describe('setUpdatePermissionStatus', function () {
  context('Update requester is not zero address', function () {
    it('sets update permission status', async function () {
      expect(
        await dapiServer.sponsorToUpdateRequesterToPermissionStatus(roles.sponsor.address, roles.randomPerson.address)
      ).to.equal(false);
      await expect(dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.randomPerson.address, true))
        .to.emit(dapiServer, 'SetUpdatePermissionStatus')
        .withArgs(roles.sponsor.address, roles.randomPerson.address, true);
      expect(
        await dapiServer.sponsorToUpdateRequesterToPermissionStatus(roles.sponsor.address, roles.randomPerson.address)
      ).to.equal(true);
      await expect(dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.randomPerson.address, false))
        .to.emit(dapiServer, 'SetUpdatePermissionStatus')
        .withArgs(roles.sponsor.address, roles.randomPerson.address, false);
      expect(
        await dapiServer.sponsorToUpdateRequesterToPermissionStatus(roles.sponsor.address, roles.randomPerson.address)
      ).to.equal(false);
    });
  });
  context('Update requester is zero address', function () {
    it('reverts', async function () {
      await expect(
        dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(hre.ethers.constants.AddressZero, false)
      ).to.be.revertedWith('Update requester zero');
    });
  });
});

describe('requestRrpBeaconUpdate', function () {
  context('Request updater is the sponsor', function () {
    context('DapiServer is sponsored', function () {
      it('requests RRP Beacon update', async function () {
        const requestId = await deriveRegularRequestId();
        expect(
          await dapiServer
            .connect(roles.sponsor)
            .callStatic.requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
        ).to.equal(requestId);
        await expect(
          dapiServer.connect(roles.sponsor).requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
        )
          .to.emit(dapiServer, 'RequestedRrpBeaconUpdate')
          .withArgs(beaconId, roles.sponsor.address, roles.sponsor.address, requestId, templateId, beaconParameters);
      });
    });
    context('DapiServer is not sponsored', function () {
      it('reverts', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, false);
        await expect(
          dapiServer.connect(roles.sponsor).requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
        ).to.be.revertedWith('Requester not sponsored');
      });
    });
  });
  context('Request updater is permitted', function () {
    context('DapiServer is sponsored', function () {
      it('requests RRP Beacon update', async function () {
        const requestId = await deriveRegularRequestId();
        expect(
          await dapiServer
            .connect(roles.updateRequester)
            .callStatic.requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
        ).to.equal(requestId);
        await expect(
          dapiServer
            .connect(roles.updateRequester)
            .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
        )
          .to.emit(dapiServer, 'RequestedRrpBeaconUpdate')
          .withArgs(
            beaconId,
            roles.sponsor.address,
            roles.updateRequester.address,
            requestId,
            templateId,
            beaconParameters
          );
      });
    });
    context('DapiServer is not sponsored', function () {
      it('reverts', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, false);
        await expect(
          dapiServer
            .connect(roles.updateRequester)
            .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
        ).to.be.revertedWith('Requester not sponsored');
      });
    });
  });
  context('Request updater is not permitted', function () {
    it('reverts', async function () {
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
      ).to.be.revertedWith('Sender not permitted');
    });
  });
});

describe('requestRrpBeaconUpdateRelayed', function () {
  context('Request updater is the sponsor', function () {
    context('DapiServer is sponsored', function () {
      it('requests RRP Beacon update', async function () {
        const requestId = await deriveRelayedRequestId();
        expect(
          await dapiServer
            .connect(roles.sponsor)
            .callStatic.requestRrpBeaconUpdateRelayed(
              templateId,
              beaconParameters,
              relayerAddress,
              roles.sponsor.address
            )
        ).to.equal(requestId);
        await expect(
          dapiServer
            .connect(roles.sponsor)
            .requestRrpBeaconUpdateRelayed(templateId, beaconParameters, relayerAddress, roles.sponsor.address)
        )
          .to.emit(dapiServer, 'RequestedRrpBeaconUpdateRelayed')
          .withArgs(
            beaconId,
            roles.sponsor.address,
            roles.sponsor.address,
            requestId,
            relayerAddress,
            templateId,
            beaconParameters
          );
      });
    });
    context('DapiServer is not sponsored', function () {
      it('reverts', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, false);
        await expect(
          dapiServer
            .connect(roles.sponsor)
            .requestRrpBeaconUpdateRelayed(templateId, beaconParameters, relayerAddress, roles.sponsor.address)
        ).to.be.revertedWith('Requester not sponsored');
      });
    });
  });
  context('Request updater is permitted', function () {
    context('DapiServer is sponsored', function () {
      it('requests RRP Beacon update', async function () {
        const requestId = await deriveRelayedRequestId();
        expect(
          await dapiServer
            .connect(roles.updateRequester)
            .callStatic.requestRrpBeaconUpdateRelayed(
              templateId,
              beaconParameters,
              relayerAddress,
              roles.sponsor.address
            )
        ).to.equal(requestId);
        await expect(
          dapiServer
            .connect(roles.updateRequester)
            .requestRrpBeaconUpdateRelayed(templateId, beaconParameters, relayerAddress, roles.sponsor.address)
        )
          .to.emit(dapiServer, 'RequestedRrpBeaconUpdateRelayed')
          .withArgs(
            beaconId,
            roles.sponsor.address,
            roles.updateRequester.address,
            requestId,
            relayerAddress,
            templateId,
            beaconParameters
          );
      });
    });
    context('DapiServer is not sponsored', function () {
      it('reverts', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, false);
        await expect(
          dapiServer
            .connect(roles.updateRequester)
            .requestRrpBeaconUpdateRelayed(templateId, beaconParameters, relayerAddress, roles.sponsor.address)
        ).to.be.revertedWith('Requester not sponsored');
      });
    });
  });
  context('Request updater is not permitted', function () {
    it('reverts', async function () {
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .requestRrpBeaconUpdateRelayed(templateId, beaconParameters, relayerAddress, roles.sponsor.address)
      ).to.be.revertedWith('Sender not permitted');
    });
  });
});

describe('fulfillRrpBeaconUpdate', function () {
  context('Sender is AirnodeProtocol', function () {
    context('Timestamp is valid', function () {
      context('Encoded data length is correct', function () {
        context('Data is typecast successfully', function () {
          context('Data is fresher than Beacon', function () {
            context('Request is regular', function () {
              it('updates Beacon', async function () {
                const initialBeacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(initialBeacon.value).to.equal(0);
                expect(initialBeacon.timestamp).to.equal(0);
                const requestId = await deriveRegularRequestId();
                await dapiServer
                  .connect(roles.updateRequester)
                  .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
                const decodedData = 123;
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
                const [data, signature] = await encodeAndSignFulfillment(
                  decodedData,
                  requestId,
                  timestamp,
                  airnodeRrpSponsorWallet.address
                );
                await expect(
                  airnodeProtocol
                    .connect(airnodeRrpSponsorWallet)
                    .fulfillRequest(
                      requestId,
                      airnodeAddress,
                      dapiServer.address,
                      dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                      timestamp,
                      data,
                      signature,
                      { gasLimit: 500000 }
                    )
                )
                  .to.emit(dapiServer, 'UpdatedBeaconWithRrp')
                  .withArgs(beaconId, requestId, decodedData, timestamp);
                const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(beacon.value).to.equal(decodedData);
                expect(beacon.timestamp).to.equal(timestamp);
              });
            });
            context('Request is relayed', function () {
              it('updates Beacon', async function () {
                const initialBeacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(initialBeacon.value).to.equal(0);
                expect(initialBeacon.timestamp).to.equal(0);
                const requestId = await deriveRelayedRequestId();
                await dapiServer
                  .connect(roles.updateRequester)
                  .requestRrpBeaconUpdateRelayed(templateId, beaconParameters, relayerAddress, roles.sponsor.address);
                const decodedData = 123;
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
                const [data, signature] = await encodeAndSignFulfillmentRelayed(
                  decodedData,
                  requestId,
                  timestamp,
                  relayerRrpSponsorWallet.address
                );
                await expect(
                  airnodeProtocol
                    .connect(relayerRrpSponsorWallet)
                    .fulfillRequestRelayed(
                      requestId,
                      airnodeAddress,
                      dapiServer.address,
                      relayerAddress,
                      dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                      timestamp,
                      data,
                      signature,
                      { gasLimit: 500000 }
                    )
                )
                  .to.emit(dapiServer, 'UpdatedBeaconWithRrp')
                  .withArgs(beaconId, requestId, decodedData, timestamp);
                const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(beacon.value).to.equal(decodedData);
                expect(beacon.timestamp).to.equal(timestamp);
              });
            });
          });
          context('Data is not fresher than Beacon', function () {
            it('does not update Beacon', async function () {
              const initialTimestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
              const requestId = await deriveRegularRequestId();
              await dapiServer
                .connect(roles.updateRequester)
                .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
              const [data, signature] = await encodeAndSignFulfillment(
                456,
                requestId,
                initialTimestamp,
                airnodeRrpSponsorWallet.address
              );
              const futureTimestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
              await setBeacon(templateId, beaconParameters, 123, futureTimestamp);
              const staticCallResult = await airnodeProtocol
                .connect(airnodeRrpSponsorWallet)
                .callStatic.fulfillRequest(
                  requestId,
                  airnodeAddress,
                  dapiServer.address,
                  dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                  initialTimestamp,
                  data,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Fulfillment older than Beacon');
              await expect(
                airnodeProtocol
                  .connect(airnodeRrpSponsorWallet)
                  .fulfillRequest(
                    requestId,
                    airnodeAddress,
                    dapiServer.address,
                    dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                    initialTimestamp,
                    data,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.not.emit(dapiServer, 'UpdatedBeaconWithRrp');
              const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
              expect(beacon.value).to.equal(123);
              expect(beacon.timestamp).to.equal(futureTimestamp);
            });
          });
        });
        context('Data is not typecast successfully', function () {
          context('Data larger than maximum int224', function () {
            it('does not update Beacon', async function () {
              const requestId = await deriveRegularRequestId();
              await dapiServer
                .connect(roles.updateRequester)
                .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
              const largeDecodedData = hre.ethers.BigNumber.from(2).pow(223);
              const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
              await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
              const [data, signature] = await encodeAndSignFulfillment(
                largeDecodedData,
                requestId,
                timestamp,
                airnodeRrpSponsorWallet.address
              );
              const staticCallResult = await airnodeProtocol
                .connect(airnodeRrpSponsorWallet)
                .callStatic.fulfillRequest(
                  requestId,
                  airnodeAddress,
                  dapiServer.address,
                  dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                  timestamp,
                  data,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Value typecasting error');
              await expect(
                airnodeProtocol
                  .connect(airnodeRrpSponsorWallet)
                  .fulfillRequest(
                    requestId,
                    airnodeAddress,
                    dapiServer.address,
                    dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                    timestamp,
                    data,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.not.emit(dapiServer, 'UpdatedBeaconWithRrp');
              const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
              expect(beacon.value).to.equal(0);
              expect(beacon.timestamp).to.equal(0);
            });
          });
          context('Data smaller than minimum int224', function () {
            it('does not update Beacon', async function () {
              const requestId = await deriveRegularRequestId();
              await dapiServer
                .connect(roles.updateRequester)
                .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
              const smallDecodedData = hre.ethers.BigNumber.from(2).pow(223).add(1).mul(-1);
              const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
              await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
              const [data, signature] = await encodeAndSignFulfillment(
                smallDecodedData,
                requestId,
                timestamp,
                airnodeRrpSponsorWallet.address
              );
              const staticCallResult = await airnodeProtocol
                .connect(airnodeRrpSponsorWallet)
                .callStatic.fulfillRequest(
                  requestId,
                  airnodeAddress,
                  dapiServer.address,
                  dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                  timestamp,
                  data,
                  signature,
                  { gasLimit: 500000 }
                );
              expect(staticCallResult.callSuccess).to.equal(false);
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Value typecasting error');
              await expect(
                airnodeProtocol
                  .connect(airnodeRrpSponsorWallet)
                  .fulfillRequest(
                    requestId,
                    airnodeAddress,
                    dapiServer.address,
                    dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                    timestamp,
                    data,
                    signature,
                    { gasLimit: 500000 }
                  )
              ).to.not.emit(dapiServer, 'UpdatedBeaconWithRrp');
              const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
              expect(beacon.value).to.equal(0);
              expect(beacon.timestamp).to.equal(0);
            });
          });
        });
      });
      context('Encoded data length is too long', function () {
        it('does not update Beacon', async function () {
          const requestId = await deriveRegularRequestId();
          await dapiServer
            .connect(roles.updateRequester)
            .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
          const decodedData = 123;
          const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
          const [data, signature] = await encodeAndSignFulfillment(
            decodedData,
            requestId,
            timestamp,
            airnodeRrpSponsorWallet.address
          );
          const longData = data + '00';
          const staticCallResult = await airnodeProtocol
            .connect(airnodeRrpSponsorWallet)
            .callStatic.fulfillRequest(
              requestId,
              airnodeAddress,
              dapiServer.address,
              dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
              timestamp,
              longData,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Data length not correct');
          await expect(
            airnodeProtocol
              .connect(airnodeRrpSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                dapiServer.address,
                dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                timestamp,
                longData,
                signature,
                { gasLimit: 500000 }
              )
          ).to.not.emit(dapiServer, 'UpdatedBeaconWithRrp');
          const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
          expect(beacon.value).to.equal(0);
          expect(beacon.timestamp).to.equal(0);
        });
      });
      context('Encoded data length is too short', function () {
        it('reverts', async function () {
          const requestId = await deriveRegularRequestId();
          await dapiServer
            .connect(roles.updateRequester)
            .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
          const decodedData = 123;
          const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
          const [data, signature] = await encodeAndSignFulfillment(
            decodedData,
            requestId,
            timestamp,
            airnodeRrpSponsorWallet.address
          );
          const shortData = data.substring(0, data.length - 2);
          const staticCallResult = await airnodeProtocol
            .connect(airnodeRrpSponsorWallet)
            .callStatic.fulfillRequest(
              requestId,
              airnodeAddress,
              dapiServer.address,
              dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
              timestamp,
              shortData,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Data length not correct');
          await expect(
            airnodeProtocol
              .connect(airnodeRrpSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                dapiServer.address,
                dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
                timestamp,
                shortData,
                signature,
                { gasLimit: 500000 }
              )
          ).to.not.emit(dapiServer, 'UpdatedBeaconWithRrp');
          const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
          expect(beacon.value).to.equal(0);
          expect(beacon.timestamp).to.equal(0);
        });
      });
    });
    context('Timestamp is older than 1 hour', function () {
      it('does not update Beacon', async function () {
        const requestId = await deriveRegularRequestId();
        await dapiServer
          .connect(roles.updateRequester)
          .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
        const decodedData = 123;
        const currentTimestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [currentTimestamp + 1]);
        const timestamp = currentTimestamp - 60 * 60;
        const [data, signature] = await encodeAndSignFulfillment(
          decodedData,
          requestId,
          timestamp,
          airnodeRrpSponsorWallet.address
        );
        const staticCallResult = await airnodeProtocol
          .connect(airnodeRrpSponsorWallet)
          .callStatic.fulfillRequest(
            requestId,
            airnodeAddress,
            dapiServer.address,
            dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          );
        expect(staticCallResult.callSuccess).to.equal(false);
        expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Invalid timestamp');
        await expect(
          airnodeProtocol
            .connect(airnodeRrpSponsorWallet)
            .fulfillRequest(
              requestId,
              airnodeAddress,
              dapiServer.address,
              dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            )
        ).to.not.emit(dapiServer, 'UpdatedBeaconWithRrp');
        const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
        expect(beacon.value).to.equal(0);
        expect(beacon.timestamp).to.equal(0);
      });
    });
    context('Timestamp is more than 15 minutes from the future', function () {
      it('reverts', async function () {
        const requestId = await deriveRegularRequestId();
        await dapiServer
          .connect(roles.updateRequester)
          .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
        const currentTimestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [currentTimestamp + 1]);
        const timestamp = currentTimestamp + 15 * 60 + 1;
        const decodedData = 123;
        const [data, signature] = await encodeAndSignFulfillment(
          decodedData,
          requestId,
          timestamp,
          airnodeRrpSponsorWallet.address
        );
        const staticCallResult = await airnodeProtocol
          .connect(airnodeRrpSponsorWallet)
          .callStatic.fulfillRequest(
            requestId,
            airnodeAddress,
            dapiServer.address,
            dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          );
        expect(staticCallResult.callSuccess).to.equal(false);
        expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Invalid timestamp');
        await expect(
          airnodeProtocol
            .connect(airnodeRrpSponsorWallet)
            .fulfillRequest(
              requestId,
              airnodeAddress,
              dapiServer.address,
              dapiServer.interface.getSighash('fulfillRrpBeaconUpdate'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            )
        ).to.not.emit(dapiServer, 'UpdatedBeaconWithRrp');
        const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
        expect(beacon.value).to.equal(0);
        expect(beacon.timestamp).to.equal(0);
      });
    });
  });
  context('Sender is not AirnodeProtocol', function () {
    it('reverts', async function () {
      await expect(
        dapiServer.connect(roles.randomPerson).fulfillRrpBeaconUpdate(hre.ethers.constants.HashZero, 0, '0x')
      ).to.be.revertedWith('Sender not Airnode protocol');
    });
  });
});

describe('registerBeaconUpdateSubscription', function () {
  context('Template is registered at the Airnode protocol', function () {
    it('registers subscription', async function () {
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .registerBeaconUpdateSubscription(
            templateId,
            beaconParameters,
            beaconUpdateSubscriptionConditions,
            airnodeAddress,
            roles.sponsor.address
          )
      )
        .to.emit(dapiServer, 'RegisteredSubscription')
        .withArgs(
          beaconUpdateSubscriptionId,
          templateId,
          beaconParameters,
          beaconUpdateSubscriptionConditions,
          airnodeAddress,
          roles.sponsor.address,
          dapiServer.address,
          dapiServer.interface.getSighash('fulfillPspBeaconUpdate')
        );
      expect(await dapiServer.subscriptionIdToBeaconId(beaconUpdateSubscriptionId)).to.equal(beaconId);
    });
  });
  context('Template is not registered at the Airnode protocol', function () {
    it('reverts', async function () {
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .registerBeaconUpdateSubscription(
            testUtils.generateRandomBytes32(),
            beaconParameters,
            beaconUpdateSubscriptionConditions,
            airnodeAddress,
            roles.sponsor.address
          )
      ).to.be.revertedWith('Template not registered');
    });
  });
});

describe('conditionPspBeaconUpdate', function () {
  context('Sender has zero address ', function () {
    context('Subscription is registered', function () {
      context('Data length is correct', function () {
        context('Condition parameters length is correct', function () {
          context('Data was initially zero', function () {
            context('Update is upwards', function () {
              it('returns true', async function () {
                const conditionData = encodeData(1);
                expect(
                  await dapiServer
                    .connect(voidSignerAddressZero)
                    .callStatic.conditionPspBeaconUpdate(
                      beaconUpdateSubscriptionId,
                      conditionData,
                      beaconUpdateSubscriptionConditionParameters
                    )
                ).to.equal(true);
              });
            });
            context('Update is downwards', function () {
              it('returns true', async function () {
                const conditionData = encodeData(-1);
                expect(
                  await dapiServer
                    .connect(voidSignerAddressZero)
                    .callStatic.conditionPspBeaconUpdate(
                      beaconUpdateSubscriptionId,
                      conditionData,
                      beaconUpdateSubscriptionConditionParameters
                    )
                ).to.equal(true);
              });
            });
          });
          context('Data makes a larger update than the threshold', function () {
            context('Update is upwards', function () {
              it('returns true', async function () {
                // Set the Beacon to 100 first
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await setBeacon(templateId, beaconParameters, 100, timestamp);
                // beaconUpdateSubscriptionConditionParameters is 10%
                // 100 -> 110 satisfies the condition and returns true
                const conditionData = encodeData(110);
                expect(
                  await dapiServer
                    .connect(voidSignerAddressZero)
                    .callStatic.conditionPspBeaconUpdate(
                      beaconUpdateSubscriptionId,
                      conditionData,
                      beaconUpdateSubscriptionConditionParameters
                    )
                ).to.equal(true);
              });
            });
            context('Update is downwards', function () {
              it('returns true', async function () {
                // Set the Beacon to 100 first
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await setBeacon(templateId, beaconParameters, 100, timestamp);
                // beaconUpdateSubscriptionConditionParameters is 10%
                // 100 -> 90 satisfies the condition and returns true
                const conditionData = encodeData(90);
                expect(
                  await dapiServer
                    .connect(voidSignerAddressZero)
                    .callStatic.conditionPspBeaconUpdate(
                      beaconUpdateSubscriptionId,
                      conditionData,
                      beaconUpdateSubscriptionConditionParameters
                    )
                ).to.equal(true);
              });
            });
          });
          context('Data does not make a larger update than the threshold', function () {
            context('Update is upwards', function () {
              it('returns false', async function () {
                // Set the Beacon to 100 first
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await setBeacon(templateId, beaconParameters, 100, timestamp);
                // beaconUpdateSubscriptionConditionParameters is 10%
                // 100 -> 109 doesn't satisfy the condition and returns false
                const conditionData = encodeData(109);
                expect(
                  await dapiServer
                    .connect(voidSignerAddressZero)
                    .callStatic.conditionPspBeaconUpdate(
                      beaconUpdateSubscriptionId,
                      conditionData,
                      beaconUpdateSubscriptionConditionParameters
                    )
                ).to.equal(false);
              });
            });
            context('Update is downwards', function () {
              it('returns false', async function () {
                // Set the Beacon to 100 first
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await setBeacon(templateId, beaconParameters, 100, timestamp);
                // beaconUpdateSubscriptionConditionParameters is 10%
                // 100 -> 91 doesn't satisfy the condition and returns false
                const conditionData = encodeData(91);
                expect(
                  await dapiServer
                    .connect(voidSignerAddressZero)
                    .callStatic.conditionPspBeaconUpdate(
                      beaconUpdateSubscriptionId,
                      conditionData,
                      beaconUpdateSubscriptionConditionParameters
                    )
                ).to.equal(false);
              });
            });
          });
        });
        context('Condition parameters length is not correct', function () {
          it('reverts', async function () {
            await dapiServer
              .connect(roles.randomPerson)
              .registerBeaconUpdateSubscription(
                templateId,
                beaconParameters,
                beaconUpdateSubscriptionConditions,
                airnodeAddress,
                roles.sponsor.address
              );
            const data = encodeData(123);
            const shortBeaconUpdateSubscriptionConditionParameters =
              beaconUpdateSubscriptionConditionParameters.substring(0, data.length - 2);
            const longBeaconUpdateSubscriptionConditionParameters = beaconUpdateSubscriptionConditionParameters + '00';
            await expect(
              dapiServer
                .connect(voidSignerAddressZero)
                .callStatic.conditionPspBeaconUpdate(
                  beaconUpdateSubscriptionId,
                  data,
                  shortBeaconUpdateSubscriptionConditionParameters
                )
            ).to.be.revertedWith('Incorrect parameter length');
            await expect(
              dapiServer
                .connect(voidSignerAddressZero)
                .callStatic.conditionPspBeaconUpdate(
                  beaconUpdateSubscriptionId,
                  data,
                  longBeaconUpdateSubscriptionConditionParameters
                )
            ).to.be.revertedWith('Incorrect parameter length');
          });
        });
      });
      context('Data length is not correct', function () {
        it('reverts', async function () {
          const data = encodeData(123);
          const shortData = data.substring(0, data.length - 2);
          const longData = data + '00';
          await expect(
            dapiServer
              .connect(voidSignerAddressZero)
              .callStatic.conditionPspBeaconUpdate(
                beaconUpdateSubscriptionId,
                shortData,
                beaconUpdateSubscriptionConditionParameters
              )
          ).to.be.revertedWith('Data length not correct');
          await expect(
            dapiServer
              .connect(voidSignerAddressZero)
              .callStatic.conditionPspBeaconUpdate(
                beaconUpdateSubscriptionId,
                longData,
                beaconUpdateSubscriptionConditionParameters
              )
          ).to.be.revertedWith('Data length not correct');
        });
      });
    });
    context('Subscription is not registered', function () {
      it('reverts', async function () {
        const data = encodeData(123);
        await expect(
          dapiServer
            .connect(voidSignerAddressZero)
            .callStatic.conditionPspBeaconUpdate(
              testUtils.generateRandomBytes32(),
              data,
              beaconUpdateSubscriptionConditionParameters
            )
        ).to.be.revertedWith('Subscription not registered');
      });
    });
  });
  context('Sender does not have zero address ', function () {
    it('reverts', async function () {
      const data = encodeData(123);
      // Static calls should revert
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .callStatic.conditionPspBeaconUpdate(
            beaconUpdateSubscriptionId,
            data,
            beaconUpdateSubscriptionConditionParameters
          )
      ).to.be.revertedWith('Sender not zero address');
      // Calls should also revert
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .conditionPspBeaconUpdate(beaconUpdateSubscriptionId, data, beaconUpdateSubscriptionConditionParameters)
      ).to.be.revertedWith('Sender not zero address');
    });
  });
});

describe('fulfillPspBeaconUpdate', function () {
  context('Timestamp is valid', function () {
    context('Subscription is registered', function () {
      context('Data length is correct', function () {
        context('Data is fresher than Beacon', function () {
          context('Subscription is regular', function () {
            context('Signature is valid', function () {
              it('updates Beacon', async function () {
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
                const [data, signature] = await encodeAndSignFulfillment(
                  123,
                  beaconUpdateSubscriptionId,
                  timestamp,
                  airnodePspSponsorWallet.address
                );
                await expect(
                  dapiServer
                    .connect(airnodePspSponsorWallet)
                    .fulfillPspBeaconUpdate(
                      beaconUpdateSubscriptionId,
                      airnodeAddress,
                      airnodeAddress,
                      roles.sponsor.address,
                      timestamp,
                      data,
                      signature,
                      { gasLimit: 500000 }
                    )
                )
                  .to.emit(dapiServer, 'UpdatedBeaconWithPsp')
                  .withArgs(beaconId, beaconUpdateSubscriptionId, 123, timestamp);
                const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(beacon.value).to.equal(123);
                expect(beacon.timestamp).to.equal(timestamp);
              });
            });
            context('Signature is not valid', function () {
              it('reverts', async function () {
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
                const data = encodeData(123);
                await expect(
                  dapiServer
                    .connect(airnodePspSponsorWallet)
                    .fulfillPspBeaconUpdate(
                      beaconUpdateSubscriptionId,
                      airnodeAddress,
                      airnodeAddress,
                      roles.sponsor.address,
                      timestamp,
                      data,
                      '0x12345678',
                      { gasLimit: 500000 }
                    )
                ).to.be.revertedWith('ECDSA: invalid signature length');
              });
            });
          });
          context('Subscription is relayed', function () {
            context('Signature is valid', function () {
              it('updates Beacon', async function () {
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
                const [data, signature] = await encodeAndSignFulfillmentRelayed(
                  123,
                  beaconUpdateSubscriptionRelayedId,
                  timestamp,
                  relayerPspSponsorWallet.address
                );
                await expect(
                  dapiServer
                    .connect(relayerPspSponsorWallet)
                    .fulfillPspBeaconUpdate(
                      beaconUpdateSubscriptionRelayedId,
                      airnodeAddress,
                      relayerAddress,
                      roles.sponsor.address,
                      timestamp,
                      data,
                      signature,
                      { gasLimit: 500000 }
                    )
                )
                  .to.emit(dapiServer, 'UpdatedBeaconWithPsp')
                  .withArgs(beaconId, beaconUpdateSubscriptionRelayedId, 123, timestamp);
                const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(beacon.value).to.equal(123);
                expect(beacon.timestamp).to.equal(timestamp);
              });
            });
            context('Signature is not valid', function () {
              it('reverts', async function () {
                const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
                const data = encodeData(123);
                await expect(
                  dapiServer
                    .connect(airnodePspSponsorWallet)
                    .fulfillPspBeaconUpdate(
                      beaconUpdateSubscriptionRelayedId,
                      airnodeAddress,
                      relayerAddress,
                      roles.sponsor.address,
                      timestamp,
                      data,
                      '0x12345678',
                      { gasLimit: 500000 }
                    )
                ).to.be.revertedWith('ECDSA: invalid signature length');
              });
            });
          });
        });
        context('Data is not fresher than Beacon', function () {
          it('reverts', async function () {
            const initialTimestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
            const futureTimestamp = initialTimestamp + 1;
            await setBeacon(templateId, beaconParameters, 123, futureTimestamp);
            const [data, signature] = await encodeAndSignFulfillment(
              456,
              beaconUpdateSubscriptionId,
              initialTimestamp,
              airnodePspSponsorWallet.address
            );
            await expect(
              dapiServer
                .connect(airnodePspSponsorWallet)
                .fulfillPspBeaconUpdate(
                  beaconUpdateSubscriptionId,
                  airnodeAddress,
                  airnodeAddress,
                  roles.sponsor.address,
                  initialTimestamp,
                  data,
                  signature,
                  { gasLimit: 500000 }
                )
            ).to.be.revertedWith('Fulfillment older than Beacon');
          });
        });
      });
      context('Data length is not correct', function () {
        it('reverts', async function () {
          const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
          const [data, signature] = await encodeAndSignFulfillment(
            123,
            beaconUpdateSubscriptionId,
            timestamp,
            airnodePspSponsorWallet.address
          );
          const longData = data + '00';
          await expect(
            dapiServer
              .connect(airnodePspSponsorWallet)
              .fulfillPspBeaconUpdate(
                beaconUpdateSubscriptionId,
                airnodeAddress,
                airnodeAddress,
                roles.sponsor.address,
                timestamp,
                longData,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Data length not correct');
        });
      });
    });
    context('Subscription is not registered', function () {
      it('reverts', async function () {
        const anotherBeaconUpdateSubscriptionId = testUtils.generateRandomBytes32();
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
        const [data, signature] = await encodeAndSignFulfillment(
          123,
          anotherBeaconUpdateSubscriptionId,
          timestamp,
          airnodePspSponsorWallet.address
        );
        await expect(
          dapiServer
            .connect(airnodePspSponsorWallet)
            .fulfillPspBeaconUpdate(
              anotherBeaconUpdateSubscriptionId,
              airnodeAddress,
              airnodeAddress,
              roles.sponsor.address,
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Subscription not registered');
      });
    });
  });
  context('Timestamp is not valid', function () {
    it('reverts', async function () {
      const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) - 60 * 60;
      const [data, signature] = await encodeAndSignFulfillment(
        123,
        beaconUpdateSubscriptionId,
        timestamp,
        airnodePspSponsorWallet.address
      );
      await expect(
        dapiServer
          .connect(airnodePspSponsorWallet)
          .fulfillPspBeaconUpdate(
            beaconUpdateSubscriptionId,
            airnodeAddress,
            airnodeAddress,
            roles.sponsor.address,
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid timestamp');
    });
  });
});

describe('updateBeaconWithSignedData', function () {
  context('Timestamp is valid', function () {
    context('Signature is valid', function () {
      context('Data length is correct', function () {
        context('Data is fresher than Beacon', function () {
          it('updates Beacon', async function () {
            const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
            await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
            const [data, signature] = await encodeAndSignData(123, beaconId, timestamp);
            await expect(
              dapiServer
                .connect(roles.randomPerson)
                .updateBeaconWithSignedData(templateId, beaconParameters, timestamp, data, signature)
            )
              .to.emit(dapiServer, 'UpdatedBeaconWithSignedData')
              .withArgs(beaconId, 123, timestamp);
            const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
            expect(beacon.value).to.equal(123);
            expect(beacon.timestamp).to.equal(timestamp);
          });
        });
        context('Data is not fresher than Beacon', function () {
          it('reverts', async function () {
            const initialTimestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
            const futureTimestamp = initialTimestamp + 1;
            await setBeacon(templateId, beaconParameters, 123, futureTimestamp);
            await hre.ethers.provider.send('evm_setNextBlockTimestamp', [futureTimestamp + 1]);
            const [data, signature] = await encodeAndSignData(456, beaconId, initialTimestamp);
            await expect(
              dapiServer
                .connect(roles.randomPerson)
                .updateBeaconWithSignedData(templateId, beaconParameters, initialTimestamp, data, signature)
            ).to.be.revertedWith('Fulfillment older than Beacon');
          });
        });
      });
      context('Data length is not correct', function () {
        it('reverts', async function () {
          const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
          const data = encodeData(123);
          const longData = data + '00';
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [beaconId, timestamp, longData])
              )
            )
          );
          await expect(
            dapiServer
              .connect(roles.randomPerson)
              .updateBeaconWithSignedData(templateId, beaconParameters, timestamp, longData, signature)
          ).to.be.revertedWith('Data length not correct');
        });
      });
    });
    context('Signature is not valid', function () {
      it('reverts', async function () {
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
        await expect(
          dapiServer
            .connect(roles.randomPerson)
            .updateBeaconWithSignedData(templateId, beaconParameters, timestamp, '0x', '0x')
        ).to.be.revertedWith('ECDSA: invalid signature length');
      });
    });
  });
  context('Timestamp is not valid', function () {
    it('reverts', async function () {
      const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) - 60 * 60;
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .updateBeaconWithSignedData(templateId, beaconParameters, timestamp, '0x', '0x')
      ).to.be.revertedWith('Invalid timestamp');
    });
  });
});

describe('updateDapiWithBeacons', function () {
  context('Did not specify less than two Beacons', function () {
    context('Updated value is not outdated', function () {
      it('updates dAPI', async function () {
        // Populate the Beacons
        let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const beaconData = [123, 456, 789];
        for (let ind = 0; ind < beaconData.length; ind++) {
          timestamp++;
          await setBeacon(templateId, dapiBeaconParameters[ind], beaconData[ind], timestamp);
        }
        const dapiInitial = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(dapiId);
        expect(dapiInitial.value).to.equal(0);
        expect(dapiInitial.timestamp).to.equal(0);
        expect(await dapiServer.connect(roles.randomPerson).callStatic.updateDapiWithBeacons(dapiBeaconIds)).to.equal(
          dapiId
        );
        await expect(dapiServer.connect(roles.randomPerson).updateDapiWithBeacons(dapiBeaconIds))
          .to.emit(dapiServer, 'UpdatedDapiWithBeacons')
          .withArgs(dapiId, 456, timestamp - 1);
      });
    });
    context('Updated value is outdated', function () {
      it('reverts', async function () {
        // Populate the Beacons
        let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const beaconData = [123, 456, 789];
        for (let ind = 0; ind < beaconData.length; ind++) {
          timestamp++;
          await setBeacon(templateId, dapiBeaconParameters[ind], beaconData[ind], timestamp);
        }
        // Update the dAPI with signed data
        const dapiData = [321, 654, 987];
        timestamp++;
        await setDapi(templateId, dapiBeaconParameters, dapiData, [timestamp, timestamp, timestamp]);
        // Update with Beacons will fail because the previous update with signed data was fresher
        await expect(dapiServer.connect(roles.randomPerson).updateDapiWithBeacons(dapiBeaconIds)).to.be.revertedWith(
          'Updated value outdated'
        );
      });
    });
  });
  context('Specified less than two Beacons', function () {
    it('reverts', async function () {
      await expect(
        dapiServer.connect(roles.randomPerson).updateDapiWithBeacons([testUtils.generateRandomBytes32()])
      ).to.be.revertedWith('Specified less than two Beacons');
      await expect(dapiServer.connect(roles.randomPerson).updateDapiWithBeacons([])).to.be.revertedWith(
        'Specified less than two Beacons'
      );
    });
  });
});

describe('conditionPspDapiUpdate', function () {
  context('Data length is correct', function () {
    context('Condition parameters length is correct', function () {
      context('Data makes a larger update than the threshold', function () {
        context('Update is upwards', function () {
          it('returns true', async function () {
            // Set the dAPI to 100 first
            let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
            timestamp++;
            await setDapi(templateId, dapiBeaconParameters, [100, 100, 100], [timestamp, timestamp, timestamp]);
            // dapiUpdateSubscriptionConditionParameters is 5%
            // 100 -> 105 satisfies the condition and returns true
            const encodedData = [105, 110, 100];
            for (let ind = 0; ind < encodedData.length; ind++) {
              timestamp++;
              await setBeacon(templateId, dapiBeaconParameters[ind], encodedData[ind], timestamp);
            }
            expect(
              await dapiServer
                .connect(roles.randomPerson)
                .callStatic.conditionPspDapiUpdate(
                  dapiUpdateSubscriptionId,
                  hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [dapiBeaconIds]),
                  dapiUpdateSubscriptionConditionParameters
                )
            ).to.equal(true);
          });
        });
        context('Update is downwards', function () {
          it('returns true', async function () {
            // Set the dAPI to 100 first
            let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
            timestamp++;
            await setDapi(templateId, dapiBeaconParameters, [100, 100, 100], [timestamp, timestamp, timestamp]);
            // dapiUpdateSubscriptionConditionParameters is 5%
            // 100 -> 95 satisfies the condition and returns true
            const encodedData = [95, 100, 90];
            for (let ind = 0; ind < encodedData.length; ind++) {
              timestamp++;
              await setBeacon(templateId, dapiBeaconParameters[ind], encodedData[ind], timestamp);
            }
            expect(
              await dapiServer
                .connect(roles.randomPerson)
                .callStatic.conditionPspDapiUpdate(
                  dapiUpdateSubscriptionId,
                  hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [dapiBeaconIds]),
                  dapiUpdateSubscriptionConditionParameters
                )
            ).to.equal(true);
          });
        });
      });
      context('Data does not make a larger update than the threshold', function () {
        context('Update is upwards', function () {
          it('returns false', async function () {
            // Set the dAPI to 100 first
            let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
            timestamp++;
            await setDapi(templateId, dapiBeaconParameters, [100, 100, 100], [timestamp, timestamp, timestamp]);
            // dapiUpdateSubscriptionConditionParameters is 5%
            // 100 -> 104 does not satisfy the condition and returns false
            const encodedData = [110, 104, 95];
            for (let ind = 0; ind < encodedData.length; ind++) {
              timestamp++;
              await setBeacon(templateId, dapiBeaconParameters[ind], encodedData[ind], timestamp);
            }
            expect(
              await dapiServer
                .connect(roles.randomPerson)
                .callStatic.conditionPspDapiUpdate(
                  dapiUpdateSubscriptionId,
                  hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [dapiBeaconIds]),
                  dapiUpdateSubscriptionConditionParameters
                )
            ).to.equal(false);
          });
        });
        context('Update is downwards', function () {
          it('returns false', async function () {
            // Set the dAPI to 100 first
            let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
            timestamp++;
            await setDapi(templateId, dapiBeaconParameters, [100, 100, 100], [timestamp, timestamp, timestamp]);
            // dapiUpdateSubscriptionConditionParameters is 5%
            // 100 -> 96 does not satisfy the condition and returns false
            const encodedData = [105, 96, 95];
            for (let ind = 0; ind < encodedData.length; ind++) {
              timestamp++;
              await setBeacon(templateId, dapiBeaconParameters[ind], encodedData[ind], timestamp);
            }
            expect(
              await dapiServer
                .connect(roles.randomPerson)
                .callStatic.conditionPspDapiUpdate(
                  dapiUpdateSubscriptionId,
                  hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [dapiBeaconIds]),
                  dapiUpdateSubscriptionConditionParameters
                )
            ).to.equal(false);
          });
        });
      });
    });
    context('Condition parameters length is not correct', function () {
      it('reverts', async function () {
        await expect(
          dapiServer
            .connect(roles.randomPerson)
            .callStatic.conditionPspDapiUpdate(
              testUtils.generateRandomBytes32(),
              hre.ethers.utils.defaultAbiCoder.encode(
                ['bytes32[]'],
                [
                  [
                    testUtils.generateRandomBytes32(),
                    testUtils.generateRandomBytes32(),
                    testUtils.generateRandomBytes32(),
                  ],
                ]
              ),
              dapiUpdateSubscriptionConditionParameters + '00'
            )
        ).to.be.revertedWith('Incorrect parameter length');
      });
    });
  });
  context('Data length is not correct', function () {
    it('reverts', async function () {
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .callStatic.conditionPspDapiUpdate(
            testUtils.generateRandomBytes32(),
            hre.ethers.utils.defaultAbiCoder.encode(
              ['bytes32[]'],
              [
                [
                  testUtils.generateRandomBytes32(),
                  testUtils.generateRandomBytes32(),
                  testUtils.generateRandomBytes32(),
                ],
              ]
            ) + '00',
            dapiUpdateSubscriptionConditionParameters
          )
      ).to.be.revertedWith('Data length not correct');
    });
  });
});

describe('fulfillPspDapiUpdate', function () {
  context('Data length is correct', function () {
    context('Subscription is regular', function () {
      it('updates dAPI', async function () {
        let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const encodedData = [95, 100, 90];
        for (let ind = 0; ind < encodedData.length; ind++) {
          timestamp++;
          await setBeacon(templateId, dapiBeaconParameters[ind], encodedData[ind], timestamp);
        }
        const data = hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [dapiBeaconIds]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [dapiUpdateSubscriptionId, timestamp, airnodePspSponsorWallet.address]
              )
            )
          )
        );
        await expect(
          dapiServer
            .connect(airnodePspSponsorWallet)
            .fulfillPspDapiUpdate(
              dapiUpdateSubscriptionId,
              airnodeAddress,
              airnodeAddress,
              roles.sponsor.address,
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            )
        )
          .to.emit(dapiServer, 'UpdatedDapiWithBeacons')
          .withArgs(dapiId, 95, timestamp - 1);
        const dapi = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(dapiId);
        expect(dapi.value).to.equal(95);
        expect(dapi.timestamp).to.equal(timestamp - 1);
      });
    });
    context('Subscription is relayed', function () {
      it('updates dAPI', async function () {
        // Note that updating a dAPI with a relayed subscription makes no sense
        // We are testing this for the sake of completeness
        let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const encodedData = [95, 100, 90];
        for (let ind = 0; ind < encodedData.length; ind++) {
          timestamp++;
          await setBeacon(templateId, dapiBeaconParameters[ind], encodedData[ind], timestamp);
        }
        const data = hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [dapiBeaconIds]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address', 'bytes'],
                [dapiUpdateSubscriptionRelayedId, timestamp, relayerPspSponsorWallet.address, data]
              )
            )
          )
        );
        await expect(
          dapiServer
            .connect(relayerPspSponsorWallet)
            .fulfillPspDapiUpdate(
              dapiUpdateSubscriptionRelayedId,
              airnodeAddress,
              relayerAddress,
              roles.sponsor.address,
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            )
        )
          .to.emit(dapiServer, 'UpdatedDapiWithBeacons')
          .withArgs(dapiId, 95, timestamp - 1);
        const dapi = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(dapiId);
        expect(dapi.value).to.equal(95);
        expect(dapi.timestamp).to.equal(timestamp - 1);
      });
    });
  });
  context('Data length is not correct', function () {
    it('reverts', async function () {
      const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
      await hre.ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
      const data = hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [dapiBeaconIds]);
      const longData = data + '00';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [dapiUpdateSubscriptionId, timestamp, airnodePspSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        dapiServer
          .connect(airnodePspSponsorWallet)
          .fulfillPspDapiUpdate(
            dapiUpdateSubscriptionId,
            airnodeAddress,
            airnodeAddress,
            roles.sponsor.address,
            timestamp,
            longData,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Data length not correct');
    });
  });
});

describe('updateDapiWithSignedData', function () {
  context('Parameter lengths match', function () {
    context('Did not specify less than two Beacons', function () {
      context('All signed timestamps are valid', function () {
        context('All signatures are valid', function () {
          context('All signed data has correct length', function () {
            context('All signed data can be typecast successfully', function () {
              context('Updated value is not outdated', function () {
                it('updates dAPI with signed data', async function () {
                  let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
                  // Set the first beacon to a value
                  timestamp++;
                  await setBeacon(templateId, dapiBeaconParameters[0], 100, timestamp);
                  // Sign data for the next two beacons
                  const [data1, signature1] = await encodeAndSignData(105, dapiBeaconIds[1], timestamp);
                  const [data2, signature2] = await encodeAndSignData(110, dapiBeaconIds[2], timestamp);
                  // Pass an empty signature for the first beacon, meaning that it will be read from the storage
                  await expect(
                    dapiServer
                      .connect(roles.randomPerson)
                      .updateDapiWithSignedData(
                        Array(3).fill(templateId),
                        dapiBeaconParameters,
                        [0, timestamp, timestamp],
                        ['0x', data1, data2],
                        ['0x', signature1, signature2]
                      )
                  )
                    .to.emit(dapiServer, 'UpdatedDapiWithSignedData')
                    .withArgs(dapiId, 105, timestamp);
                  const dapi = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(dapiId);
                  expect(dapi.value).to.equal(105);
                  expect(dapi.timestamp).to.equal(timestamp);
                });
              });
              context('Updated value is outdated', function () {
                it('reverts', async function () {
                  let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
                  timestamp++;
                  await setDapi(templateId, dapiBeaconParameters, Array(3).fill(100), Array(3).fill(timestamp));
                  // Set the first beacon to a value
                  timestamp++;
                  await setBeacon(templateId, dapiBeaconParameters[0], 100, timestamp);
                  // Sign data for the next two beacons
                  const [data1, signature1] = await encodeAndSignData(110, dapiBeaconIds[1], timestamp - 5);
                  const [data2, signature2] = await encodeAndSignData(105, dapiBeaconIds[2], timestamp - 5);
                  // Pass an empty signature for the first beacon, meaning that it will be read from the storage
                  await expect(
                    dapiServer
                      .connect(roles.randomPerson)
                      .updateDapiWithSignedData(
                        Array(3).fill(templateId),
                        dapiBeaconParameters,
                        [0, timestamp - 5, timestamp - 5],
                        ['0x', data1, data2],
                        ['0x', signature1, signature2]
                      )
                  ).to.be.revertedWith('Updated value outdated');
                });
              });
            });
            context('All signed data cannot be typecast successfully', function () {
              it('reverts', async function () {
                let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
                // Set the first beacon to a value
                timestamp++;
                await setBeacon(templateId, dapiBeaconParameters[0], 100, timestamp);
                // Sign data for the next beacons
                const [data1, signature1] = await encodeAndSignData(110, dapiBeaconIds[1], timestamp);
                // The third data contains an un-typecastable value
                const data2 = encodeData(hre.ethers.BigNumber.from(2).pow(223));
                const signature2 = await airnodeWallet.signMessage(
                  hre.ethers.utils.arrayify(
                    hre.ethers.utils.keccak256(
                      hre.ethers.utils.solidityPack(
                        ['bytes32', 'uint256', 'bytes'],
                        [dapiBeaconIds[2], timestamp, data2]
                      )
                    )
                  )
                );
                // Pass an empty signature for the first beacon, meaning that it will be read from the storage
                await expect(
                  dapiServer
                    .connect(roles.randomPerson)
                    .updateDapiWithSignedData(
                      Array(3).fill(templateId),
                      dapiBeaconParameters,
                      [0, timestamp, timestamp],
                      ['0x', data1, data2],
                      ['0x', signature1, signature2]
                    )
                ).to.be.revertedWith('Value typecasting error');
              });
            });
          });
          context('Not all signed data has correct length', function () {
            it('reverts', async function () {
              let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
              // Set the first beacon to a value
              timestamp++;
              await setBeacon(templateId, dapiBeaconParameters[0], 100, timestamp);
              // Sign data for the next beacons
              const [data1, signature1] = await encodeAndSignData(110, dapiBeaconIds[1], timestamp);
              // The third data does not have the correct length
              const data2 = encodeData(105) + '00';
              const signature2 = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [dapiBeaconIds[2], timestamp, data2])
                  )
                )
              );
              // Pass an empty signature for the first beacon, meaning that it will be read from the storage
              await expect(
                dapiServer
                  .connect(roles.randomPerson)
                  .updateDapiWithSignedData(
                    Array(3).fill(templateId),
                    dapiBeaconParameters,
                    [0, timestamp, timestamp],
                    ['0x', data1, data2],
                    ['0x', signature1, signature2]
                  )
              ).to.be.revertedWith('Data length not correct');
            });
          });
        });
        context('Not all signatures are valid', function () {
          it('reverts', async function () {
            let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
            // Set the first beacon to a value
            timestamp++;
            await setBeacon(templateId, dapiBeaconParameters[0], 100, timestamp);
            // Sign data for the next two beacons
            const [data1, signature1] = await encodeAndSignData(110, dapiBeaconIds[1], timestamp);
            const [data2] = await encodeAndSignData(105, dapiBeaconIds[2], timestamp);
            // Pass an empty signature for the first beacon, meaning that it will be read from the storage
            // The signature for the third beacon is invalid
            await expect(
              dapiServer
                .connect(roles.randomPerson)
                .updateDapiWithSignedData(
                  Array(3).fill(templateId),
                  dapiBeaconParameters,
                  [0, timestamp, timestamp],
                  ['0x', data1, data2],
                  ['0x', signature1, '0x12345678']
                )
            ).to.be.revertedWith('ECDSA: invalid signature length');
          });
        });
      });
      context('Not all signed timestamps are valid', function () {
        it('reverts', async function () {
          let timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          // Set the first beacon to a value
          timestamp++;
          await setBeacon(templateId, dapiBeaconParameters[0], 100, timestamp);
          // Sign data for the next two beacons
          const [data1, signature1] = await encodeAndSignData(110, dapiBeaconIds[1], timestamp);
          const [data2, signature2] = await encodeAndSignData(105, dapiBeaconIds[2], 0);
          // Pass an empty signature for the first beacon, meaning that it will be read from the storage
          // The timestamp for the third beacon is invalid
          await expect(
            dapiServer
              .connect(roles.randomPerson)
              .updateDapiWithSignedData(
                Array(3).fill(templateId),
                dapiBeaconParameters,
                [0, timestamp, 0],
                ['0x', data1, data2],
                ['0x', signature1, signature2]
              )
          ).to.be.revertedWith('Invalid timestamp');
        });
      });
    });
    context('Specified less than two Beacons', function () {
      it('reverts', async function () {
        await expect(
          dapiServer.connect(roles.randomPerson).updateDapiWithSignedData([], [], [], [], [])
        ).to.be.revertedWith('Specified less than two Beacons');
        await expect(
          dapiServer
            .connect(roles.randomPerson)
            .updateDapiWithSignedData(
              [testUtils.generateRandomBytes32()],
              [testUtils.generateRandomBytes()],
              [0],
              [testUtils.generateRandomBytes()],
              [testUtils.generateRandomBytes()]
            )
        ).to.be.revertedWith('Specified less than two Beacons');
      });
    });
  });
  context('Parameter lengths do not match', function () {
    it('reverts', async function () {
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .updateDapiWithSignedData(
            Array(4).fill(testUtils.generateRandomBytes32()),
            Array(3).fill(testUtils.generateRandomBytes()),
            Array(3).fill(0),
            Array(3).fill(testUtils.generateRandomBytes()),
            Array(3).fill(testUtils.generateRandomBytes())
          )
      ).to.be.revertedWith('Parameter length mismatch');
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .updateDapiWithSignedData(
            Array(3).fill(testUtils.generateRandomBytes32()),
            Array(4).fill(testUtils.generateRandomBytes()),
            Array(3).fill(0),
            Array(3).fill(testUtils.generateRandomBytes()),
            Array(3).fill(testUtils.generateRandomBytes())
          )
      ).to.be.revertedWith('Parameter length mismatch');
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .updateDapiWithSignedData(
            Array(3).fill(testUtils.generateRandomBytes32()),
            Array(3).fill(testUtils.generateRandomBytes()),
            Array(4).fill(0),
            Array(3).fill(testUtils.generateRandomBytes()),
            Array(3).fill(testUtils.generateRandomBytes())
          )
      ).to.be.revertedWith('Parameter length mismatch');
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .updateDapiWithSignedData(
            Array(3).fill(testUtils.generateRandomBytes32()),
            Array(3).fill(testUtils.generateRandomBytes()),
            Array(3).fill(0),
            Array(4).fill(testUtils.generateRandomBytes()),
            Array(3).fill(testUtils.generateRandomBytes())
          )
      ).to.be.revertedWith('Parameter length mismatch');
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .updateDapiWithSignedData(
            Array(3).fill(testUtils.generateRandomBytes32()),
            Array(3).fill(testUtils.generateRandomBytes()),
            Array(3).fill(0),
            Array(3).fill(testUtils.generateRandomBytes()),
            Array(4).fill(testUtils.generateRandomBytes())
          )
      ).to.be.revertedWith('Parameter length mismatch');
    });
  });
});

describe('setName', function () {
  context('Name is not zero', function () {
    context('Data point ID is not zero', function () {
      context('Sender is name setter', function () {
        it('sets name', async function () {
          const name = hre.ethers.utils.formatBytes32String('My dAPI');
          expect(await dapiServer.nameToDataPointId(name)).to.equal(hre.ethers.constants.HashZero);
          await expect(dapiServer.connect(roles.nameSetter).setName(name, dapiId))
            .to.emit(dapiServer, 'SetName')
            .withArgs(name, dapiId, roles.nameSetter.address);
          expect(await dapiServer.nameToDataPointId(name)).to.equal(dapiId);
        });
      });
      context('Sender is not name setter', function () {
        it('reverts', async function () {
          const name = hre.ethers.utils.formatBytes32String('My dAPI');
          await expect(dapiServer.connect(roles.randomPerson).setName(name, dapiId)).to.be.revertedWith(
            'Sender cannot set name'
          );
        });
      });
    });
    context('Data point ID is zero', function () {
      it('reverts', async function () {
        const name = hre.ethers.utils.formatBytes32String('My dAPI');
        await expect(
          dapiServer.connect(roles.nameSetter).setName(name, hre.ethers.constants.HashZero)
        ).to.be.revertedWith('Data point ID zero');
      });
    });
  });
  context('Name is zero', function () {
    it('reverts', async function () {
      await expect(
        dapiServer.connect(roles.nameSetter).setName(hre.ethers.constants.HashZero, dapiId)
      ).to.be.revertedWith('Name zero');
    });
  });
});

describe('readWithDataPointId', function () {
  context('Reader is zero address', function () {
    context('Data point is Beacon', function () {
      it('reads Beacon', async function () {
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setBeacon(templateId, beaconParameters, 123, timestamp);
        const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
        expect(beacon.value).to.be.equal(123);
        expect(beacon.timestamp).to.be.equal(timestamp);
      });
    });
    context('Data point is dAPI', function () {
      it('reads dAPI', async function () {
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setDapi(templateId, dapiBeaconParameters, [123, 456, 789], [timestamp - 2, timestamp, timestamp + 2]);
        const dapi = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(dapiId);
        expect(dapi.value).to.be.equal(456);
        expect(dapi.timestamp).to.be.equal(timestamp);
      });
    });
  });
  context('Reader is whitelisted', function () {
    context('Data point is Beacon', function () {
      it('reads Beacon', async function () {
        await dapiServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(beaconId, roles.randomPerson.address, true);
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setBeacon(templateId, beaconParameters, 123, timestamp);
        const beacon = await dapiServer.connect(roles.randomPerson).readWithDataPointId(beaconId);
        expect(beacon.value).to.be.equal(123);
        expect(beacon.timestamp).to.be.equal(timestamp);
      });
    });
    context('Data point is dAPI', function () {
      it('reads dAPI', async function () {
        await dapiServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(dapiId, roles.randomPerson.address, true);
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setDapi(templateId, dapiBeaconParameters, [123, 456, 789], [timestamp - 2, timestamp, timestamp + 2]);
        const dapi = await dapiServer.connect(roles.randomPerson).readWithDataPointId(dapiId);
        expect(dapi.value).to.be.equal(456);
        expect(dapi.timestamp).to.be.equal(timestamp);
      });
    });
  });
  context('Reader is unlimited reader', function () {
    context('Data point is Beacon', function () {
      it('reads Beacon', async function () {
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setBeacon(templateId, beaconParameters, 123, timestamp);
        const beacon = await dapiServer.connect(roles.unlimitedReader).readWithDataPointId(beaconId);
        expect(beacon.value).to.be.equal(123);
        expect(beacon.timestamp).to.be.equal(timestamp);
      });
    });
    context('Data point is dAPI', function () {
      it('reads dAPI', async function () {
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setDapi(templateId, dapiBeaconParameters, [123, 456, 789], [timestamp - 2, timestamp, timestamp + 2]);
        const dapi = await dapiServer.connect(roles.unlimitedReader).readWithDataPointId(dapiId);
        expect(dapi.value).to.be.equal(456);
        expect(dapi.timestamp).to.be.equal(timestamp);
      });
    });
  });
  context('Reader is none of the above', function () {
    context('Data point is Beacon', function () {
      it('reverts', async function () {
        await expect(dapiServer.connect(roles.randomPerson).readWithDataPointId(beaconId)).to.be.revertedWith(
          'Sender cannot read'
        );
      });
    });
    context('Data point is dAPI', function () {
      it('reverts', async function () {
        await expect(dapiServer.connect(roles.randomPerson).readWithDataPointId(dapiId)).to.be.revertedWith(
          'Sender cannot read'
        );
      });
    });
  });
});

describe('readWithName', function () {
  context('Reader is zero address', function () {
    context('Name set to Beacon', function () {
      it('reads Beacon', async function () {
        const name = hre.ethers.utils.formatBytes32String('My beacon');
        await dapiServer.connect(roles.nameSetter).setName(name, beaconId);
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setBeacon(templateId, beaconParameters, 123, timestamp);
        const beacon = await dapiServer.connect(voidSignerAddressZero).readWithName(name);
        expect(beacon.value).to.be.equal(123);
        expect(beacon.timestamp).to.be.equal(timestamp);
      });
    });
    context('Name set to dAPI', function () {
      it('reads dAPI', async function () {
        const name = hre.ethers.utils.formatBytes32String('My dAPI');
        await dapiServer.connect(roles.nameSetter).setName(name, dapiId);
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setDapi(templateId, dapiBeaconParameters, [123, 456, 789], [timestamp - 2, timestamp, timestamp + 2]);
        const dapi = await dapiServer.connect(voidSignerAddressZero).readWithName(name);
        expect(dapi.value).to.be.equal(456);
        expect(dapi.timestamp).to.be.equal(timestamp);
      });
    });
  });
  context('Reader is whitelisted', function () {
    context('Name set to Beacon', function () {
      it('reads Beacon', async function () {
        const name = hre.ethers.utils.formatBytes32String('My beacon');
        await dapiServer.connect(roles.nameSetter).setName(name, beaconId);
        // Whitelist for the name hash, not the data point ID
        const nameHash = hre.ethers.utils.keccak256(hre.ethers.utils.defaultAbiCoder.encode(['bytes32'], [name]));
        await dapiServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(nameHash, roles.randomPerson.address, true);
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setBeacon(templateId, beaconParameters, 123, timestamp);
        const beacon = await dapiServer.connect(roles.randomPerson).readWithName(name);
        expect(beacon.value).to.be.equal(123);
        expect(beacon.timestamp).to.be.equal(timestamp);
      });
    });
    context('Name set to dAPI', function () {
      it('reads dAPI', async function () {
        const name = hre.ethers.utils.formatBytes32String('My dAPI');
        await dapiServer.connect(roles.nameSetter).setName(name, dapiId);
        // Whitelist for the name hash, not the data point ID
        const nameHash = hre.ethers.utils.keccak256(hre.ethers.utils.defaultAbiCoder.encode(['bytes32'], [name]));
        await dapiServer
          .connect(roles.indefiniteWhitelister)
          .setIndefiniteWhitelistStatus(nameHash, roles.randomPerson.address, true);
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setDapi(templateId, dapiBeaconParameters, [123, 456, 789], [timestamp - 2, timestamp, timestamp + 2]);
        const dapi = await dapiServer.connect(roles.randomPerson).readWithName(name);
        expect(dapi.value).to.be.equal(456);
        expect(dapi.timestamp).to.be.equal(timestamp);
      });
    });
  });
  context('Reader is unlimited reader', function () {
    context('Name set to Beacon', function () {
      it('reads Beacon', async function () {
        const name = hre.ethers.utils.formatBytes32String('My beacon');
        await dapiServer.connect(roles.nameSetter).setName(name, beaconId);
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setBeacon(templateId, beaconParameters, 123, timestamp);
        const beacon = await dapiServer.connect(roles.unlimitedReader).readWithName(name);
        expect(beacon.value).to.be.equal(123);
        expect(beacon.timestamp).to.be.equal(timestamp);
      });
    });
    context('Name set to dAPI', function () {
      it('reads dAPI', async function () {
        const name = hre.ethers.utils.formatBytes32String('My dAPI');
        await dapiServer.connect(roles.nameSetter).setName(name, dapiId);
        const timestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
        await setDapi(templateId, dapiBeaconParameters, [123, 456, 789], [timestamp - 2, timestamp, timestamp + 2]);
        const dapi = await dapiServer.connect(roles.unlimitedReader).readWithName(name);
        expect(dapi.value).to.be.equal(456);
        expect(dapi.timestamp).to.be.equal(timestamp);
      });
    });
  });
  context('Reader is none of the above', function () {
    context('Name set to Beacon', function () {
      it('reverts', async function () {
        const name = hre.ethers.utils.formatBytes32String('My beacon');
        await dapiServer.connect(roles.nameSetter).setName(name, beaconId);
        await expect(dapiServer.connect(roles.randomPerson).readWithName(name)).to.be.revertedWith(
          'Sender cannot read'
        );
      });
    });
    context('Name set to dAPI', function () {
      it('reverts', async function () {
        const name = hre.ethers.utils.formatBytes32String('My dAPI');
        await dapiServer.connect(roles.nameSetter).setName(name, dapiId);
        await expect(dapiServer.connect(roles.randomPerson).readWithName(name)).to.be.revertedWith(
          'Sender cannot read'
        );
      });
    });
  });
});

describe('readerCanReadDataPoint', function () {
  context('Reader is zero address', function () {
    it('returns true for all data points', async function () {
      expect(
        await dapiServer.readerCanReadDataPoint(testUtils.generateRandomBytes32(), hre.ethers.constants.AddressZero)
      ).to.equal(true);
    });
  });
  context('Reader is whitelisted', function () {
    it('returns true for the data point that the reader is whitelisted for', async function () {
      await dapiServer
        .connect(roles.indefiniteWhitelister)
        .setIndefiniteWhitelistStatus(beaconId, roles.randomPerson.address, true);
      expect(await dapiServer.readerCanReadDataPoint(beaconId, roles.randomPerson.address)).to.equal(true);
      expect(
        await dapiServer.readerCanReadDataPoint(testUtils.generateRandomBytes32(), roles.randomPerson.address)
      ).to.equal(false);
    });
  });
  context('Reader is unlimited reader', function () {
    it('returns true for all data points', async function () {
      expect(
        await dapiServer.readerCanReadDataPoint(testUtils.generateRandomBytes32(), roles.unlimitedReader.address)
      ).to.equal(true);
    });
  });
  context('Reader is none of the above', function () {
    it('returns false for all data points', async function () {
      expect(
        await dapiServer.readerCanReadDataPoint(testUtils.generateRandomBytes32(), roles.randomPerson.address)
      ).to.equal(false);
    });
  });
});

describe('dataPointIdToReaderToWhitelistStatus', function () {
  it('returns whitelist status of the reader for the data point ID', async function () {
    const initialWhitelistStatus = await dapiServer.dataPointIdToReaderToWhitelistStatus(
      beaconId,
      roles.randomPerson.address
    );
    expect(initialWhitelistStatus.expirationTimestamp).to.equal(0);
    expect(initialWhitelistStatus.indefiniteWhitelistCount).to.equal(0);
    await dapiServer.connect(roles.manager).setIndefiniteWhitelistStatus(beaconId, roles.randomPerson.address, true);
    await dapiServer.connect(roles.manager).setWhitelistExpiration(beaconId, roles.randomPerson.address, 123456);
    const whitelistStatus = await dapiServer.dataPointIdToReaderToWhitelistStatus(beaconId, roles.randomPerson.address);
    expect(whitelistStatus.expirationTimestamp).to.equal(123456);
    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
  });
});

describe('dataPointIdToReaderToSetterToIndefiniteWhitelistStatus', function () {
  it('returns indefinite whitelist status of the setter for the reader and the data point ID', async function () {
    expect(
      await dapiServer.dataPointIdToReaderToSetterToIndefiniteWhitelistStatus(
        beaconId,
        roles.randomPerson.address,
        roles.indefiniteWhitelister.address
      )
    ).to.equal(false);
    await dapiServer
      .connect(roles.indefiniteWhitelister)
      .setIndefiniteWhitelistStatus(beaconId, roles.randomPerson.address, true);
    expect(
      await dapiServer.dataPointIdToReaderToSetterToIndefiniteWhitelistStatus(
        beaconId,
        roles.randomPerson.address,
        roles.indefiniteWhitelister.address
      )
    ).to.equal(true);
  });
});

describe('deriveBeaconId', function () {
  it('derives Beacon ID', async function () {
    expect(await dapiServer.deriveBeaconId(templateId, beaconParameters)).to.equal(beaconId);
    expect(await dapiServer.deriveBeaconId(templateId, '0x')).to.equal(
      hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, '0x']))
    );
    // templateId != beaconId if `parameters` is empty
    expect(await dapiServer.deriveBeaconId(templateId, '0x')).to.not.equal(templateId);
  });
});

describe('deriveDapiId', function () {
  it('derives dAPI ID', async function () {
    expect(await dapiServer.deriveDapiId(dapiBeaconIds)).to.equal(dapiId);
    // dapiId != 0 if no beacon ID is specified
    expect(await dapiServer.deriveDapiId([])).to.not.equal(hre.ethers.constants.HashZero);
  });
});
