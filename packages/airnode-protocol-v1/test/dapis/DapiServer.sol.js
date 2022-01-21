/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry, airnodeProtocol, dapiServer;
let dapiServerAdminRoleDescription = 'DapiServer admin';
let adminRole, indefiniteWhitelisterRole, unlimitedReaderRole, nameSetterRole;
let airnodeAddress, airnodeMnemonic, airnodeWallet;
let relayerAddress, relayerMnemonic;
let airnodeRrpSponsorWallet, relayerRrpSponsorWallet;
let voidSignerAddressZero;
let endpointId, templateParameters, templateId, beaconParameters, beaconId;
let beaconUpdateSubscriptionId,
  beaconUpdateSubscriptionRelayedId,
  beaconUpdateSubscriptionConditionParameters,
  beaconUpdateSubscriptionConditions;
let dapiUpdateSubscriptionId, dapiUpdateSubscriptionConditionParameters, dapiUpdateSubscriptionConditions;
let beaconIds = [hre.ethers.constants.HashZero];

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    indefiniteWhitelister: accounts[4],
    unlimitedReader: accounts[6],
    nameSetter: accounts[7],
    sponsor: accounts[8],
    updateRequester: accounts[9],
    beaconReader: accounts[10],
    randomPerson: accounts[11],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocolV1', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  const dapiServerFactory = await hre.ethers.getContractFactory('DapiServer', roles.deployer);
  dapiServer = await dapiServerFactory.deploy(
    accessControlRegistry.address,
    dapiServerAdminRoleDescription,
    roles.manager.address,
    airnodeProtocol.address
  );
  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  // Initialize the roles and grant them to respective accounts
  adminRole = await dapiServer.adminRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(managerRootRole, dapiServerAdminRoleDescription);
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

  ({ airnodeAddress, airnodeMnemonic } = testUtils.generateRandomAirnodeWallet());
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
  const relayerData = testUtils.generateRandomAirnodeWallet();
  relayerAddress = relayerData.airnodeAddress;
  relayerMnemonic = relayerData.airnodeMnemonic;
  airnodeRrpSponsorWallet = testUtils
    .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address, 1)
    .connect(hre.ethers.provider);
  relayerRrpSponsorWallet = testUtils
    .deriveSponsorWallet(relayerMnemonic, roles.sponsor.address, 2)
    .connect(hre.ethers.provider);
  await roles.deployer.sendTransaction({
    to: airnodeRrpSponsorWallet.address,
    value: hre.ethers.utils.parseEther('1'),
  });
  await roles.deployer.sendTransaction({
    to: relayerRrpSponsorWallet.address,
    value: hre.ethers.utils.parseEther('1'),
  });
  voidSignerAddressZero = new hre.ethers.VoidSigner(hre.ethers.constants.AddressZero, hre.ethers.provider);
  endpointId = testUtils.generateRandomBytes32();
  templateParameters = testUtils.generateRandomBytes();
  await airnodeProtocol.connect(roles.randomPerson).storeTemplate(airnodeAddress, endpointId, templateParameters);
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, templateParameters])
  );
  beaconParameters = testUtils.generateRandomBytes();
  beaconId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, beaconParameters])
  );
  // Create beacon update conditions using Airnode ABI
  beaconUpdateSubscriptionConditionParameters = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256'],
    [(await dapiServer.HUNDRED_PERCENT()).div(10)]
  );
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
  // Store and register the beacon update subscription
  await airnodeProtocol
    .connect(roles.randomPerson)
    .storeSubscription(
      templateId,
      beaconParameters,
      beaconUpdateSubscriptionConditions,
      airnodeAddress,
      roles.sponsor.address,
      dapiServer.address,
      dapiServer.interface.getSighash('fulfillPspBeaconUpdate')
    );
  beaconUpdateSubscriptionId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'bytes32', 'bytes', 'bytes', 'address', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeProtocol.address,
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
  // Store and register the relayed beacon update subscription
  await airnodeProtocol
    .connect(roles.randomPerson)
    .storeSubscription(
      templateId,
      beaconParameters,
      beaconUpdateSubscriptionConditions,
      relayerAddress,
      roles.sponsor.address,
      dapiServer.address,
      dapiServer.interface.getSighash('fulfillPspBeaconUpdate')
    );
  beaconUpdateSubscriptionRelayedId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'bytes32', 'bytes', 'bytes', 'address', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeProtocol.address,
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
  // Create and store the dAPI update template
  await airnodeProtocol.connect(roles.randomPerson).storeTemplate(airnodeAddress, hre.ethers.constants.HashZero, '0x');
  const dapiUpdateTemplateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['address', 'bytes32', 'bytes'],
      [airnodeAddress, hre.ethers.constants.HashZero, '0x']
    )
  );
  // Create dAPI update conditions using Airnode ABI
  dapiUpdateSubscriptionConditionParameters = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256'],
    [(await dapiServer.HUNDRED_PERCENT()).div(20)]
  );
  dapiUpdateSubscriptionConditions = hre.ethers.utils.defaultAbiCoder.encode(
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
  // Store and register the dAPI update subscription
  const dapiUpdateParameters = hre.ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [beaconIds]);
  await airnodeProtocol
    .connect(roles.randomPerson)
    .storeSubscription(
      dapiUpdateTemplateId,
      dapiUpdateParameters,
      dapiUpdateSubscriptionConditionParameters,
      airnodeAddress,
      roles.sponsor.address,
      dapiServer.address,
      dapiServer.interface.getSighash('fulfillPspDapiUpdate')
    );
  dapiUpdateSubscriptionId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'bytes32', 'bytes', 'bytes', 'address', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeProtocol.address,
        dapiUpdateTemplateId,
        dapiUpdateParameters,
        dapiUpdateSubscriptionConditionParameters,
        airnodeAddress,
        roles.sponsor.address,
        dapiServer.address,
        dapiServer.interface.getSighash('fulfillPspDapiUpdate'),
      ]
    )
  );
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
        await dapiServer.sponsorToUpdateRequesterToPermissionStatus(
          roles.sponsor.address,
          roles.updateRequester.address
        )
      ).to.equal(false);
      await expect(dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true))
        .to.emit(dapiServer, 'SetUpdatePermissionStatus')
        .withArgs(roles.sponsor.address, roles.updateRequester.address, true);
      expect(
        await dapiServer.sponsorToUpdateRequesterToPermissionStatus(
          roles.sponsor.address,
          roles.updateRequester.address
        )
      ).to.equal(true);
      await expect(dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, false))
        .to.emit(dapiServer, 'SetUpdatePermissionStatus')
        .withArgs(roles.sponsor.address, roles.updateRequester.address, false);
      expect(
        await dapiServer.sponsorToUpdateRequesterToPermissionStatus(
          roles.sponsor.address,
          roles.updateRequester.address
        )
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
      it('requests RRP beacon update', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
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
        // Request the beacon update
        await expect(
          dapiServer.connect(roles.sponsor).requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
        )
          .to.emit(dapiServer, 'RequestedRrpBeaconUpdate')
          .withArgs(beaconId, roles.sponsor.address, roles.sponsor.address, requestId, templateId, beaconParameters);
      });
    });
    context('DapiServer is not sponsored', function () {
      it('reverts', async function () {
        // Attempt to request beacon update
        await expect(
          dapiServer.connect(roles.sponsor).requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
        ).to.be.revertedWith('Requester not sponsored');
      });
    });
  });
  context('Request updater is permitted', function () {
    context('DapiServer is sponsored', function () {
      it('requests RRP beacon update', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
        await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
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
        // Request the beacon update
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
        await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Attempt to request beacon update
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
      // Attempt to request beacon update
      await expect(
        dapiServer
          .connect(roles.updateRequester)
          .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address)
      ).to.be.revertedWith('Sender not permitted');
    });
  });
});

describe('requestRrpBeaconUpdateRelayed', function () {
  context('Request updater is the sponsor', function () {
    context('DapiServer is sponsored', function () {
      it('requests RRP beacon update', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
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
        // Request the beacon update
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
        // Attempt to request beacon update
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
      it('requests RRP beacon update', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
        await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
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
        // Request the beacon update
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
        await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Attempt to request beacon update
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
      // Attempt to request beacon update
      await expect(
        dapiServer
          .connect(roles.updateRequester)
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
          context('Data is fresher than beacon', function () {
            context('Request is regular', function () {
              it('updates beacon', async function () {
                const initialBeacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(initialBeacon.value).to.equal(0);
                expect(initialBeacon.timestamp).to.equal(0);
                await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
                await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
                // Compute the expected request ID
                const requestId = hre.ethers.utils.keccak256(
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
                // Request the beacon update
                await dapiServer
                  .connect(roles.updateRequester)
                  .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
                const encodedData = 123;
                const timestamp = Math.floor(Date.now() / 1000);
                const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
                const signature = await airnodeWallet.signMessage(
                  hre.ethers.utils.arrayify(
                    hre.ethers.utils.keccak256(
                      hre.ethers.utils.solidityPack(
                        ['bytes32', 'uint256', 'address'],
                        [requestId, timestamp, airnodeRrpSponsorWallet.address]
                      )
                    )
                  )
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
                  .withArgs(beaconId, requestId, encodedData, timestamp);
                const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(beacon.value).to.equal(encodedData);
                expect(beacon.timestamp).to.equal(timestamp);
              });
            });
            context('Request is relayed', function () {
              it('updates beacon', async function () {
                const initialBeacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(initialBeacon.value).to.equal(0);
                expect(initialBeacon.timestamp).to.equal(0);
                await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
                await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
                // Compute the expected request ID
                const requestId = hre.ethers.utils.keccak256(
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
                // Request the beacon update
                await dapiServer
                  .connect(roles.updateRequester)
                  .requestRrpBeaconUpdateRelayed(templateId, beaconParameters, relayerAddress, roles.sponsor.address);
                const encodedData = 123;
                const timestamp = Math.floor(Date.now() / 1000);
                const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
                const signature = await airnodeWallet.signMessage(
                  hre.ethers.utils.arrayify(
                    hre.ethers.utils.keccak256(
                      hre.ethers.utils.solidityPack(
                        ['bytes32', 'uint256', 'address', 'bytes'],
                        [requestId, timestamp, relayerRrpSponsorWallet.address, data]
                      )
                    )
                  )
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
                  .withArgs(beaconId, requestId, encodedData, timestamp);
                const beacon = await dapiServer.connect(voidSignerAddressZero).readWithDataPointId(beaconId);
                expect(beacon.value).to.equal(encodedData);
                expect(beacon.timestamp).to.equal(timestamp);
              });
            });
          });
          context('Data is not fresher than beacon', function () {
            it('reverts', async function () {
              await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
              await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
              // Compute the expected request ID
              const requestId = hre.ethers.utils.keccak256(
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
              // Request the beacon update
              await dapiServer
                .connect(roles.updateRequester)
                .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
              // Prepare the response
              const timestamp = Math.floor(Date.now() / 1000);
              const encodedData = 123;
              const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(
                      ['bytes32', 'uint256', 'address'],
                      [requestId, timestamp, airnodeRrpSponsorWallet.address]
                    )
                  )
                )
              );
              // Update the beacon with signed data before fulfilling the request
              await dapiServer.updateBeaconWithSignedData(
                templateId,
                beaconParameters,
                timestamp + 1,
                data,
                await airnodeWallet.signMessage(
                  hre.ethers.utils.arrayify(
                    hre.ethers.utils.keccak256(
                      hre.ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [beaconId, timestamp + 1, data])
                    )
                  )
                )
              );
              // Attempt to fulfill the request
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
              expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Fulfillment older than beacon');
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
              ).to.emit(airnodeProtocol, 'FailedRequest');
            });
          });
        });
        context('Data is not typecast successfully', function () {
          context('Data larger than maximum int224', function () {
            it('reverts', async function () {
              await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
              await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
              // Compute the expected request ID
              const requestId = hre.ethers.utils.keccak256(
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
              // Request the beacon update
              await dapiServer
                .connect(roles.updateRequester)
                .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
              // Fulfill with non-typecastable data
              // Data should not be too large
              const encodedData = hre.ethers.BigNumber.from(2).pow(223);
              const timestamp = Math.floor(Date.now() / 1000);
              const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(
                      ['bytes32', 'uint256', 'address'],
                      [requestId, timestamp, airnodeRrpSponsorWallet.address]
                    )
                  )
                )
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
              ).to.emit(airnodeProtocol, 'FailedRequest');
            });
          });
          context('Data smaller than minimum int224', function () {
            it('reverts', async function () {
              await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
              await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
              // Compute the expected request ID
              const requestId = hre.ethers.utils.keccak256(
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
              // Request the beacon update
              await dapiServer
                .connect(roles.updateRequester)
                .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
              // Fulfill with non-typecastable data
              // Data should not be too small
              const encodedData = hre.ethers.BigNumber.from(2).pow(223).add(1).mul(-1);
              const timestamp = Math.floor(Date.now() / 1000);
              const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(
                      ['bytes32', 'uint256', 'address'],
                      [requestId, timestamp, airnodeRrpSponsorWallet.address]
                    )
                  )
                )
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
              ).to.emit(airnodeProtocol, 'FailedRequest');
            });
          });
        });
      });
      context('Encoded data length is too long', function () {
        it('reverts', async function () {
          await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
          await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
          // Compute the expected request ID
          const requestId = hre.ethers.utils.keccak256(
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
          // Request the beacon update
          await dapiServer
            .connect(roles.updateRequester)
            .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
          const encodedData = 123;
          const timestamp = Math.floor(Date.now() / 1000);
          const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
          const longData = data + '00';
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address'],
                  [requestId, timestamp, airnodeRrpSponsorWallet.address]
                )
              )
            )
          );
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
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Incorrect data length');
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
          ).to.emit(airnodeProtocol, 'FailedRequest');
        });
      });
      context('Encoded data length is too short', function () {
        it('reverts', async function () {
          await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
          await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
          // Compute the expected request ID
          const requestId = hre.ethers.utils.keccak256(
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
          // Request the beacon update
          await dapiServer
            .connect(roles.updateRequester)
            .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
          const encodedData = 123;
          const timestamp = Math.floor(Date.now() / 1000);
          const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
          const shortData = data.substring(0, data.length - 2);
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address'],
                  [requestId, timestamp, airnodeRrpSponsorWallet.address]
                )
              )
            )
          );
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
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Incorrect data length');
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
          ).to.emit(airnodeProtocol, 'FailedRequest');
        });
      });
    });
    context('Timestamp is older than 1 hour', function () {
      it('reverts', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
        await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
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
        // Request the beacon update
        await dapiServer
          .connect(roles.updateRequester)
          .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
        const encodedData = 123;
        const timestamp = Math.floor(Date.now() / 1000) - 75 * 60;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [requestId, timestamp, airnodeRrpSponsorWallet.address]
              )
            )
          )
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
        ).to.emit(airnodeProtocol, 'FailedRequest');
      });
    });
    context('Timestamp is more than 15 minutes from the future', function () {
      it('reverts', async function () {
        await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
        await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
        // Compute the expected request ID
        const requestId = hre.ethers.utils.keccak256(
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
        // Request the beacon update
        await dapiServer
          .connect(roles.updateRequester)
          .requestRrpBeaconUpdate(templateId, beaconParameters, roles.sponsor.address);
        const encodedData = 123;
        const timestamp = Math.floor(Date.now() / 1000) + 60 * 60;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [requestId, timestamp, airnodeRrpSponsorWallet.address]
              )
            )
          )
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
        ).to.emit(airnodeProtocol, 'FailedRequest');
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
  context('Subscription is registered at the Airnode protocol', function () {
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
        .withArgs(beaconUpdateSubscriptionId, beaconId);
    });
  });
  context('Subscription is not registered at the Airnode protocol', function () {
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
      ).to.be.revertedWith('Not registered at protocol');
    });
  });
});

/*
describe('conditionPspBeaconUpdate', function () {
  context('Sender has zero address ', function () {
    context('Subscription is registered', function () {
      context('Data is valid', function () {
        context('Condition parameters are valid', function () {
          context('Data makes a larger update than the threshold', function () {
            it('returns true', async function () {
              // Set the beacon to 100 first
              const initialEncodedData = 100;
              const initialData = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [initialEncodedData]);
              const timestamp = Math.floor(Date.now() / 1000);
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [beaconId, timestamp, initialData])
                  )
                )
              );
              await dapiServer.updateBeaconWithSignedData(
                templateId,
                beaconParameters,
                timestamp,
                initialData,
                signature
              );
              // beaconUpdateSubscriptionConditionParameters is 10%
              // 100 -> 110 satisfies the condition and returns true
              const conditionEncodedData = 110;
              const conditionData = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [conditionEncodedData]);
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
          context('Data does not make a larger update than the threshold', function () {
            it('returns false', async function () {
              // Set the beacon to 100 first
              const initialEncodedData = 100;
              const initialData = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [initialEncodedData]);
              const timestamp = Math.floor(Date.now() / 1000);
              const signature = await airnodeWallet.signMessage(
                hre.ethers.utils.arrayify(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [beaconId, timestamp, initialData])
                  )
                )
              );
              await dapiServer.updateBeaconWithSignedData(
                templateId,
                beaconParameters,
                timestamp,
                initialData,
                signature
              );
              // beaconUpdateSubscriptionConditionParameters is 10%
              // 100 -> 109 doesn't satisfy the condition and returns false
              const conditionEncodedData = 109;
              const conditionData = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [conditionEncodedData]);
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
        context('Condition parameters are not valid', function () {
          it('reverts', async function () {
            const encodedData = 123;
            const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
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
      context('Data is not valid', function () {
        it('reverts', async function () {
          const encodedData = 123;
          const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
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
          ).to.be.revertedWith('Incorrect data length');
          await expect(
            dapiServer
              .connect(voidSignerAddressZero)
              .callStatic.conditionPspBeaconUpdate(
                beaconUpdateSubscriptionId,
                longData,
                beaconUpdateSubscriptionConditionParameters
              )
          ).to.be.revertedWith('Incorrect data length');
        });
      });
    });
    context('Subscription is not registered', function () {
      it('reverts', async function () {
        const encodedData = 123;
        const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
        await expect(
          dapiServer
            .connect(voidSignerAddressZero)
            .callStatic.conditionPspBeaconUpdate(
              hre.ethers.constants.HashZero,
              data,
              beaconUpdateSubscriptionConditionParameters
            )
        ).to.be.revertedWith('Subscription not registered');
      });
    });
  });
  context('Sender does not have zero address ', function () {
    it('reverts', async function () {
      const encodedData = 123;
      const data = hre.ethers.utils.defaultAbiCoder.encode(['int256'], [encodedData]);
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
      // Regular calls should also revert
      await expect(
        dapiServer
          .connect(roles.randomPerson)
          .conditionPspBeaconUpdate(beaconUpdateSubscriptionId, data, beaconUpdateSubscriptionConditionParameters)
      ).to.be.revertedWith('Sender not zero address');
    });
  });
});

describe('fulfillPspBeaconUpdate', function () {
  context('Sender is AirnodeProtocol', function () {
    context('Timestamp is valid', function () {
      context('Subscription exists', function () {
        context('Data is valid', function () {
          context('Data is fresher than beacon', function () {
            it('updates beacon', async function () {});
          });
          context('Data is not fresher than beacon', function () {
            it('reverts', async function () {});
          });
        });
        context('Data is not valid', function () {
          it('reverts', async function () {});
        });
      });
      context('Subscription does not exist', function () {
        it('reverts', async function () {});
      });
    });
    context('Timestamp is not valid', function () {
      it('reverts', async function () {});
    });
  });
  context('Sender is not AirnodeProtocol', function () {
    it('reverts', async function () {});
  });
});
*/
/*

describe('readBeacon', function () {
  context('Sender whitelisted', function () {
    it('reads beacon', async function () {
      await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
      await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
      // Whitelist the beacon reader
      await dapiServer
        .connect(roles.indefiniteWhitelister)
        .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
      // Confirm that the beacon is empty
      const initialBeacon = await dapiServer.connect(roles.beaconReader).readBeacon(beaconId);
      expect(initialBeacon.value).to.be.equal(0);
      expect(initialBeacon.timestamp).to.be.equal(0);
      // Compute the expected request ID
      const requestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
          [
            (await hre.ethers.provider.getNetwork()).chainId,
            airnodeProtocol.address,
            dapiServer.address,
            await airnodeProtocol.requesterToRequestCountPlusOne(dapiServer.address),
            templateId,
            roles.sponsor.address,
            airnodeRrpSponsorWallet.address,
            dapiServer.address,
            dapiServer.interface.getSighash('fulfill'),
            beaconParameters,
          ]
        )
      );
      // Request the beacon update
      await dapiServer
        .connect(roles.updateRequester)
        .requestRrpBeaconUpdate(templateId, roles.sponsor.address, airnodeRrpSponsorWallet.address, beaconParameters);
      // Fulfill with 0 status code
      const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
      await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      const encodedData = 123;
      const encodedTimestamp = now;
      const data = hre.ethers.utils.defaultAbiCoder.encode(['int256', 'uint256'], [encodedData, encodedTimestamp]);
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
        )
      );
      await airnodeProtocol
        .connect(airnodeRrpSponsorWallet)
        .fulfill(
          requestId,
          airnodeAddress,
          dapiServer.address,
          dapiServer.interface.getSighash('fulfill'),
          data,
          signature,
          { gasLimit: 500000 }
        );
      // Read the beacon again
      const currentBeacon = await dapiServer.connect(roles.beaconReader).readBeacon(beaconId);
      expect(currentBeacon.value).to.be.equal(encodedData);
      expect(currentBeacon.timestamp).to.be.equal(encodedTimestamp);
    });
  });
  context('Sender address zero', function () {
    it('reads beacon', async function () {
      await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
      await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
      // Confirm that the beacon is empty
      const initialBeacon = await dapiServer.connect(voidSignerAddressZero).readBeacon(beaconId);
      expect(initialBeacon.value).to.be.equal(0);
      expect(initialBeacon.timestamp).to.be.equal(0);
      // Compute the expected request ID
      const requestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
          [
            (await hre.ethers.provider.getNetwork()).chainId,
            airnodeProtocol.address,
            dapiServer.address,
            await airnodeProtocol.requesterToRequestCountPlusOne(dapiServer.address),
            templateId,
            roles.sponsor.address,
            airnodeRrpSponsorWallet.address,
            dapiServer.address,
            dapiServer.interface.getSighash('fulfill'),
            beaconParameters,
          ]
        )
      );
      // Request the beacon update
      await dapiServer
        .connect(roles.updateRequester)
        .requestRrpBeaconUpdate(templateId, roles.sponsor.address, airnodeRrpSponsorWallet.address, beaconParameters);
      // Fulfill with 0 status code
      const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
      await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      const encodedData = 123;
      const encodedTimestamp = now;
      const data = hre.ethers.utils.defaultAbiCoder.encode(['int256', 'uint256'], [encodedData, encodedTimestamp]);
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
        )
      );
      await airnodeProtocol
        .connect(airnodeRrpSponsorWallet)
        .fulfill(
          requestId,
          airnodeAddress,
          dapiServer.address,
          dapiServer.interface.getSighash('fulfill'),
          data,
          signature,
          { gasLimit: 500000 }
        );
      // Read the beacon again
      const currentBeacon = await dapiServer.connect(voidSignerAddressZero).readBeacon(beaconId);
      expect(currentBeacon.value).to.be.equal(encodedData);
      expect(currentBeacon.timestamp).to.be.equal(encodedTimestamp);
    });
  });
  context('Sender not whitelisted', function () {
    it('reverts', async function () {
      await expect(dapiServer.connect(roles.beaconReader).readBeacon(beaconId)).to.be.revertedWith(
        'Sender not whitelisted'
      );
    });
  });
});

describe('readerCanReadBeacon', function () {
  context('User whitelisted', function () {
    it('returns true', async function () {
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
      const expirationTimestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1000;
      await dapiServer
        .connect(roles.whitelistExpirationSetter)
        .setWhitelistExpiration(beaconId, roles.beaconReader.address, expirationTimestamp);
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
      await dapiServer
        .connect(roles.indefiniteWhitelister)
        .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
      await dapiServer
        .connect(roles.whitelistExpirationSetter)
        .setWhitelistExpiration(beaconId, roles.beaconReader.address, 0);
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
      await dapiServer
        .connect(roles.indefiniteWhitelister)
        .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, false);
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
    });
  });
  context('User zero address', function () {
    it('returns true', async function () {
      expect(await dapiServer.readerCanReadBeacon(beaconId, hre.ethers.constants.AddressZero)).to.equal(true);
    });
  });
  context('User not whitelisted', function () {
    it('returns false', async function () {
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.randomPerson.address)).to.equal(false);
    });
  });
});

describe('readBeacon', function () {
  context('Sender whitelisted', function () {
    it('reads beacon', async function () {
      await airnodeProtocol.connect(roles.sponsor).setSponsorshipStatus(dapiServer.address, true);
      await dapiServer.connect(roles.sponsor).setUpdatePermissionStatus(roles.updateRequester.address, true);
      // Whitelist the beacon reader
      await dapiServer
        .connect(roles.indefiniteWhitelister)
        .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
      // Confirm that the beacon is empty
      const initialBeacon = await dapiServer.connect(roles.beaconReader).readBeacon(beaconId);
      expect(initialBeacon.value).to.be.equal(0);
      expect(initialBeacon.timestamp).to.be.equal(0);
      // Compute the expected request ID
      const requestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'address', 'address', 'uint256', 'bytes32', 'address', 'address', 'address', 'bytes4', 'bytes'],
          [
            (await hre.ethers.provider.getNetwork()).chainId,
            airnodeProtocol.address,
            dapiServer.address,
            await airnodeProtocol.requesterToRequestCountPlusOne(dapiServer.address),
            templateId,
            roles.sponsor.address,
            airnodeRrpSponsorWallet.address,
            dapiServer.address,
            dapiServer.interface.getSighash('fulfill'),
            beaconParameters,
          ]
        )
      );
      // Request the beacon update
      await dapiServer
        .connect(roles.updateRequester)
        .requestRrpBeaconUpdate(templateId, roles.sponsor.address, airnodeRrpSponsorWallet.address, beaconParameters);
      // Fulfill
      const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
      await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      const encodedData = 123;
      const encodedTimestamp = now;
      const data = hre.ethers.utils.defaultAbiCoder.encode(['int256', 'uint256'], [encodedData, encodedTimestamp]);
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data]))
        )
      );
      await airnodeProtocol
        .connect(airnodeRrpSponsorWallet)
        .fulfill(
          requestId,
          airnodeAddress,
          dapiServer.address,
          dapiServer.interface.getSighash('fulfill'),
          data,
          signature,
          { gasLimit: 500000 }
        );
      // Read the beacon again
      const currentBeacon = await dapiServer.connect(roles.beaconReader).readBeacon(beaconId);
      expect(currentBeacon.value).to.be.equal(encodedData);
      expect(currentBeacon.timestamp).to.be.equal(encodedTimestamp);
    });
  });
  context('Sender not whitelisted', function () {
    it('reverts', async function () {
      await expect(dapiServer.connect(roles.beaconReader).readBeacon(beaconId)).to.be.revertedWith(
        'Sender not whitelisted'
      );
    });
  });
});

describe('readerCanReadBeacon', function () {
  context('User whitelisted', function () {
    it('returns true', async function () {
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
      const expirationTimestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1000;
      await dapiServer
        .connect(roles.whitelistExpirationSetter)
        .setWhitelistExpiration(beaconId, roles.beaconReader.address, expirationTimestamp);
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
      await dapiServer
        .connect(roles.indefiniteWhitelister)
        .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, true);
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
      await dapiServer
        .connect(roles.whitelistExpirationSetter)
        .setWhitelistExpiration(beaconId, roles.beaconReader.address, 0);
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(true);
      await dapiServer
        .connect(roles.indefiniteWhitelister)
        .setIndefiniteWhitelistStatus(beaconId, roles.beaconReader.address, false);
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.beaconReader.address)).to.equal(false);
    });
  });
  context('User not whitelisted', function () {
    it('returns false', async function () {
      expect(await dapiServer.readerCanReadBeacon(beaconId, roles.randomPerson.address)).to.equal(false);
    });
  });
});

describe('deriveBeaconId', function () {
  it('derives beacon ID', async function () {
    expect(await dapiServer.deriveBeaconId(templateId, beaconParameters)).to.equal(beaconId);
    expect(await dapiServer.deriveBeaconId(templateId, '0x')).to.equal(
      hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [templateId, '0x']))
    );
    // templateId != beaconId if `parameters` is empty
    expect(await dapiServer.deriveBeaconId(templateId, '0x')).to.not.equal(templateId);
  });
});
*/
