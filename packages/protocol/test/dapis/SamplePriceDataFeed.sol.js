const { expect } = require('chai');

const AdminStatus = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
};

let roles;
let airnodeRrp, rrpDapiServer, samplePriceDataFeed;
let airnodeId, masterWallet, designatedWallet;
let templateId1, templateId2, templateId3;
let defaultTemplateIds;

beforeEach(async () => {
  const [
    deployer,
    metaAdmin,
    superAdmin,
    admin,
    anotherAdmin,
    randomPerson,
    ...otherAccounts
  ] = await ethers.getSigners();
  roles = {
    deployer,
    metaAdmin,
    superAdmin,
    admin,
    anotherAdmin,
    randomPerson,
    otherAccounts,
  };
  // Deploy contracts
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const rrpDapiServerFactory = await ethers.getContractFactory('RrpDapiServer', roles.deployer);
  rrpDapiServer = await rrpDapiServerFactory.deploy(airnodeRrp.address);
  const samplePriceDataFeedFactory = await ethers.getContractFactory('SamplePriceDataFeed', roles.deployer);
  samplePriceDataFeed = await samplePriceDataFeedFactory.deploy(rrpDapiServer.address, roles.metaAdmin.address);
  // Set Admin status to admin and anotherAdmin addresses
  await samplePriceDataFeed.connect(roles.metaAdmin).setAdminStatus(roles.admin.address, AdminStatus.Admin);
  await samplePriceDataFeed.connect(roles.metaAdmin).setAdminStatus(roles.anotherAdmin.address, AdminStatus.Admin);
  // Set SuperAdmin status to superAdmin address
  await samplePriceDataFeed.connect(roles.metaAdmin).setAdminStatus(roles.superAdmin.address, AdminStatus.SuperAdmin);
  // Set Unauthorized status to randomPerson address
  await samplePriceDataFeed
    .connect(roles.metaAdmin)
    .setAdminStatus(roles.randomPerson.address, AdminStatus.Unauthorized);
  // Create the requester
  await airnodeRrp.connect(roles.superAdmin).createRequester(roles.admin.address);
  // Generate the Airnode private key and derive the related parameters
  const requesterIndex = 1;
  const airnodeWallet = ethers.Wallet.createRandom();
  const airnodeMnemonic = airnodeWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(airnodeMnemonic);
  masterWallet = new ethers.Wallet(hdNode.privateKey, waffle.provider);
  // Compute airnodeId off-chain
  airnodeId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
  designatedWallet = ethers.Wallet.fromMnemonic(airnodeMnemonic, `m/0/${requesterIndex}`).connect(waffle.provider);
  // Fund the Airnode master wallet for it to be able to set the Airnode parameters
  await roles.metaAdmin.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('1'),
  });
  // Fund the designated wallet so that it can be withdrawn from
  await roles.admin.sendTransaction({
    to: designatedWallet.address,
    value: ethers.utils.parseEther('1'),
  });
  // Create the template
  const endpointId1 = ethers.utils.hexlify(ethers.utils.randomBytes(32));
  const endpointId2 = ethers.utils.hexlify(ethers.utils.randomBytes(32));
  const endpointId3 = ethers.utils.hexlify(ethers.utils.randomBytes(32));
  const templateParameters1 = ethers.utils.hexlify(ethers.utils.randomBytes(320));
  const templateParameters2 = ethers.utils.hexlify(ethers.utils.randomBytes(320));
  const templateParameters3 = ethers.utils.hexlify(ethers.utils.randomBytes(320));
  await airnodeRrp.createTemplate(airnodeId, endpointId1, templateParameters1);
  // Compute templateId1 off-chain
  templateId1 = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [airnodeId, endpointId1, templateParameters1])
  );
  await airnodeRrp.createTemplate(airnodeId, endpointId2, templateParameters2);
  // Compute templateId2 off-chain
  templateId2 = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [airnodeId, endpointId2, templateParameters2])
  );
  await airnodeRrp.createTemplate(airnodeId, endpointId3, templateParameters3);
  // Compute templateId3 off-chain
  templateId3 = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [airnodeId, endpointId3, templateParameters3])
  );
  defaultTemplateIds = [templateId1, templateId2, templateId3];
  // Register dapi
  const tx = await rrpDapiServer.registerDapi(
    [templateId1, templateId2, templateId3],
    Array(3).fill(designatedWallet.address),
    1 /* noResponsesToReduce */,
    10 /* toleranceInPercentages */,
    requesterIndex,
    samplePriceDataFeed.address /* reduceAddress */,
    samplePriceDataFeed.interface.getSighash('reduce') /* reduceFunctionId */,
    ethers.constants.AddressZero /* requestIndexResetter */
  );
  const { events } = await tx.wait();
  // Get dapiId and set it on SamplePriceDataFeed
  const [dapiId] = events.filter((e) => e.event == 'DapiRegistered').map((e) => e.args[0]);
  await samplePriceDataFeed.connect(roles.metaAdmin).setDapi(dapiId);
});

describe('constructor', function () {
  context('RRP Dapi Server address is non-zero', function () {
    it('initializes correctly', async function () {
      expect(await samplePriceDataFeed.rrpDapiServer()).to.equal(rrpDapiServer.address);
    });
  });
  context('RRP Dapi Server address is zero', function () {
    it('reverts', async function () {
      const samplePriceDataFeedFactory = await ethers.getContractFactory('SamplePriceDataFeed', roles.deployer);
      await expect(
        samplePriceDataFeedFactory.deploy(ethers.constants.AddressZero, roles.metaAdmin.address)
      ).to.be.revertedWith('Zero address');
    });
  });
});

describe('updateDapi', function () {
  context('Caller is an admin', function () {
    it('reverts when trying to update dapi with same templateIds', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(previousDapiId, defaultTemplateIds, Array(3).fill(designatedWallet.address))
      ).to.be.revertedWith('templateIds or designatedWallets must be different');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      const [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.eql(defaultTemplateIds);
    });
    it('adds a new templateId to dapi', async function () {
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );

      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(previousDapiId, [...defaultTemplateIds, newTemplateId], Array(4).fill(designatedWallet.address))
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , previousTemplateIds] = await rrpDapiServer.getDapi(previousDapiId);
      expect(previousTemplateIds).to.eql(defaultTemplateIds);
      const [, , , newTemplateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(newTemplateIds).to.eql([...defaultTemplateIds, newTemplateId]);
    });
    it('removes a templateId from dapi (begining of array)', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(previousDapiId, [templateId2, templateId3], Array(2).fill(designatedWallet.address))
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.eql([templateId2, templateId3]);
    });
    it('removes a templateId from dapi (middle of array)', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(previousDapiId, [templateId1, templateId3], Array(2).fill(designatedWallet.address))
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId2);
      expect(templateIds).to.eql([templateId1, templateId3]);
    });
    it('removes a templateId from dapi (end of array)', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(previousDapiId, [templateId1, templateId2], Array(2).fill(designatedWallet.address))
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId3);
      expect(templateIds).to.eql([templateId1, templateId2]);
    });
    it('updates first templateId in a dapi', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(
            previousDapiId,
            [newTemplateId, templateId2, templateId3],
            Array(3).fill(designatedWallet.address)
          )
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.eql([newTemplateId, templateId2, templateId3]);
    });
    it('updates a templateId in the middle of the list in a dapi', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(
            previousDapiId,
            [templateId1, newTemplateId, templateId3],
            Array(3).fill(designatedWallet.address)
          )
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId2);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.eql([templateId1, newTemplateId, templateId3]);
    });
    it('updates last templateId in a dapi', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(
            previousDapiId,
            [templateId1, templateId2, newTemplateId],
            Array(3).fill(designatedWallet.address)
          )
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId3);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.eql([templateId1, templateId2, newTemplateId]);
    });
  });
  context('Caller is an super admin', function () {
    it('adds a new templateId to dapi', async function () {
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );

      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.superAdmin)
          .updateDapi(previousDapiId, [...defaultTemplateIds, newTemplateId], Array(4).fill(designatedWallet.address))
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , previousTemplateIds] = await rrpDapiServer.getDapi(previousDapiId);
      expect(previousTemplateIds).to.have.same.members([templateId1, templateId2, templateId3]);
      const [, , , newTemplateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(newTemplateIds).to.have.same.members([templateId1, templateId2, templateId3, newTemplateId]);
    });
    it('removes a templateId from dapi', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.superAdmin)
          .updateDapi(previousDapiId, [templateId2, templateId3], Array(2).fill(designatedWallet.address))
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.eql([templateId2, templateId3]);
    });
    it('updates templateId in a dapi', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.superAdmin)
          .updateDapi(
            previousDapiId,
            [newTemplateId, templateId2, templateId3],
            Array(3).fill(designatedWallet.address)
          )
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.eql([newTemplateId, templateId2, templateId3]);
    });
  });
  context('Caller is the meta admin', function () {
    it('adds a new templateId to dapi', async function () {
      // Because in the test setup we call SamplePriceDataFeed.setDapi() function
      // that updates the cooldown timestamp then we must increase the block time
      // in order to be able to call SamplePriceDataFeed.removeTemplate() as metaAdmin
      const days = 2;
      ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
      ethers.provider.send('evm_mine');

      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );

      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.metaAdmin)
          .updateDapi(previousDapiId, [...defaultTemplateIds, newTemplateId], Array(4).fill(designatedWallet.address))
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , previousTemplateIds] = await rrpDapiServer.getDapi(previousDapiId);
      expect(previousTemplateIds).to.have.same.members([templateId1, templateId2, templateId3]);
      const [, , , newTemplateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(newTemplateIds).to.eql([templateId1, templateId2, templateId3, newTemplateId]);
    });
    it('removes a templateId from dapi', async function () {
      // Because in the test setup we call SamplePriceDataFeed.setDapi() function
      // that updates the cooldown timestamp then we must increase the block time
      // in order to be able to call SamplePriceDataFeed.removeTemplate() as metaAdmin
      const days = 2;
      ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
      ethers.provider.send('evm_mine');

      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.metaAdmin)
          .updateDapi(previousDapiId, [templateId2, templateId3], Array(2).fill(designatedWallet.address))
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.eql([templateId2, templateId3]);
    });
    it('updates templateId in a dapi', async function () {
      // Because in the test setup we call SamplePriceDataFeed.setDapi() function
      // that updates the cooldown timestamp then we must increase the block time
      // in order to be able to call SamplePriceDataFeed.removeTemplate() as metaAdmin
      const days = 2;
      ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
      ethers.provider.send('evm_mine');

      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.metaAdmin)
          .updateDapi(
            previousDapiId,
            [newTemplateId, templateId2, templateId3],
            Array(3).fill(designatedWallet.address)
          )
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.eql([newTemplateId, templateId2, templateId3]);
    });
  });
  context('Caller is unauthorized', function () {
    it('reverts when trying to add a templateId', async function () {
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );

      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.randomPerson)
          .updateDapi(previousDapiId, [...defaultTemplateIds, newTemplateId], Array(4).fill(designatedWallet.address))
      ).to.be.revertedWith('Unauthorized');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      const [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.eql([templateId1, templateId2, templateId3]);
    });
    it('reverts when trying to remove a templateId', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.randomPerson)
          .updateDapi(previousDapiId, [templateId2, templateId3], Array(2).fill(designatedWallet.address))
      ).to.be.revertedWith('Unauthorized');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      const [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.eql([templateId1, templateId2, templateId3]);
    });
    it('reverts when trying to update a templateId', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.randomPerson)
          .updateDapi(
            previousDapiId,
            [newTemplateId, templateId2, templateId3],
            Array(3).fill(designatedWallet.address)
          )
      ).to.be.revertedWith('Unauthorized');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      const [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).eql([templateId1, templateId2, templateId3]);
    });
  });
  context('Caller has updated the dapi and cooldown period has elapsed', function () {
    it('adds a new templateId to dapi', async function () {
      const endpointId4 = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const templateParameters4 = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, endpointId4, templateParameters4);
      const templateId4 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, endpointId4, templateParameters4]
        )
      );

      let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      let previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateDapi(previousDapiId, [...defaultTemplateIds, templateId4], Array(4).fill(designatedWallet.address));

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , previousTemplateIds] = await rrpDapiServer.getDapi(previousDapiId);
      expect(previousTemplateIds).to.eql([templateId1, templateId2, templateId3]);
      let [, , , newTemplateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(newTemplateIds).to.eql([templateId1, templateId2, templateId3, templateId4]);

      // Time travel
      const days = 2;
      ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
      ethers.provider.send('evm_mine');

      const endpointId5 = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const templateParameters5 = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, endpointId5, templateParameters5);
      const templateId5 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, endpointId5, templateParameters5]
        )
      );

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(
            previousDapiId,
            [...defaultTemplateIds, templateId4, templateId5],
            Array(5).fill(designatedWallet.address)
          )
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      [, , , previousTemplateIds] = await rrpDapiServer.getDapi(previousDapiId);
      expect(previousTemplateIds).to.eql([templateId1, templateId2, templateId3, templateId4]);
      [, , , newTemplateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(newTemplateIds).to.eql([templateId1, templateId2, templateId3, templateId4, templateId5]);
    });
    it('removes a templateId from dapi', async function () {
      let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      let previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateDapi(previousDapiId, [templateId2, templateId3], Array(2).fill(designatedWallet.address));

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.eql([templateId2, templateId3]);

      // Time travel
      const days = 2;
      ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
      ethers.provider.send('evm_mine');

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed.connect(roles.admin).updateDapi(previousDapiId, [templateId3], [designatedWallet.address])
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId2);
      expect(templateIds).to.eql([templateId3]);
    });
    it('updates templateId in a dapi', async function () {
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );
      let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      let previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateDapi(previousDapiId, [newTemplateId, templateId2, templateId3], Array(3).fill(designatedWallet.address));

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.eql([newTemplateId, templateId2, templateId3]);

      // Time travel
      const days = 2;
      ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
      ethers.provider.send('evm_mine');

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(previousDapiId, defaultTemplateIds, Array(3).fill(designatedWallet.address))
      ).to.emit(samplePriceDataFeed, 'DapiUpdated');

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(newTemplateId);
      expect(templateIds).to.include(templateId1);
      expect(templateIds).to.eql([templateId1, templateId2, templateId3]);
    });
  });
  context('Caller has updated the dapi within cooldown period', function () {
    it('reverts when trying to add a templateId', async function () {
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );

      let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      let previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateDapi(previousDapiId, [...defaultTemplateIds, newTemplateId], Array(4).fill(designatedWallet.address));

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.eql([templateId1, templateId2, templateId3, newTemplateId]);

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(
            previousDapiId,
            [...defaultTemplateIds, newTemplateId, newTemplateId],
            Array(5).fill(designatedWallet.address)
          )
      ).to.be.revertedWith('Cooldown period has not finished');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.eql([templateId1, templateId2, templateId3, newTemplateId]);
    });
    it('reverts when trying to remove a templateId', async function () {
      let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      let previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateDapi(previousDapiId, [templateId2, templateId3], Array(2).fill(designatedWallet.address));

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.have.same.members([templateId2, templateId3]);

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed.connect(roles.admin).updateDapi(previousDapiId, [templateId3], [designatedWallet.address])
      ).to.be.revertedWith('Cooldown period has not finished');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.have.same.members([templateId2, templateId3]);
    });
    it('reverts when trying to remove a templateId', async function () {
      const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
      const newTemplateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, newEndpointId, newTemplateParameters]
        )
      );
      let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      let previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateDapi(previousDapiId, [newTemplateId, templateId2, templateId3], Array(3).fill(designatedWallet.address));

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.eql([newTemplateId, templateId2, templateId3]);

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(previousDapiId, [templateId1, templateId2, templateId3], Array(3).fill(designatedWallet.address))
      ).to.be.revertedWith('Cooldown period has not finished');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.eql([newTemplateId, templateId2, templateId3]);
    });
  });
  context(
    'Caller has updated the dapi and cooldown period has not elapsed but a different admin is also trying to update the dapi',
    function () {
      it('adds a new templateId to dapi', async function () {
        const endpointId1 = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        const templateParameters1 = ethers.utils.hexlify(ethers.utils.randomBytes(320));
        await airnodeRrp.createTemplate(airnodeId, endpointId1, templateParameters1);
        const templateId1 = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes'],
            [airnodeId, endpointId1, templateParameters1]
          )
        );

        let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
        let previousDapiId = await samplePriceDataFeed.latestDapiId();
        await samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(previousDapiId, [...defaultTemplateIds, templateId1], Array(4).fill(designatedWallet.address));

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        let newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).to.include(templateId1);
        expect(templateIds).to.eql([...defaultTemplateIds, templateId1]);

        const endpointId2 = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        const templateParameters2 = ethers.utils.hexlify(ethers.utils.randomBytes(320));
        await airnodeRrp.createTemplate(airnodeId, endpointId2, templateParameters2);
        const templateId2 = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes'],
            [airnodeId, endpointId2, templateParameters2]
          )
        );

        nextDapiIndex = await rrpDapiServer.nextDapiIndex();
        previousDapiId = await samplePriceDataFeed.latestDapiId();
        await samplePriceDataFeed
          .connect(roles.anotherAdmin)
          .updateDapi(
            previousDapiId,
            [...defaultTemplateIds, templateId1, templateId2],
            Array(5).fill(designatedWallet.address)
          );

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).to.include(templateId2);
        expect(templateIds).to.eql([...defaultTemplateIds, templateId1, templateId2]);
      });
      it('removes a templateId from dapi', async function () {
        let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
        let previousDapiId = await samplePriceDataFeed.latestDapiId();
        await samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(previousDapiId, [templateId2, templateId3], Array(2).fill(designatedWallet.address));

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        let newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).not.to.include(templateId1);
        expect(templateIds).eql([templateId2, templateId3]);

        nextDapiIndex = await rrpDapiServer.nextDapiIndex();
        previousDapiId = await samplePriceDataFeed.latestDapiId();
        await expect(
          samplePriceDataFeed
            .connect(roles.anotherAdmin)
            .updateDapi(previousDapiId, [templateId3], [designatedWallet.address])
        ).to.emit(samplePriceDataFeed, 'DapiUpdated');

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).not.to.include(templateId2);
        expect(templateIds).eql([templateId3]);
      });
      it('updates templateId in a dapi', async function () {
        const newEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        const newTemplateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
        await airnodeRrp.createTemplate(airnodeId, newEndpointId, newTemplateParameters);
        const newTemplateId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes'],
            [airnodeId, newEndpointId, newTemplateParameters]
          )
        );
        let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
        let previousDapiId = await samplePriceDataFeed.latestDapiId();
        await samplePriceDataFeed
          .connect(roles.admin)
          .updateDapi(
            previousDapiId,
            [newTemplateId, templateId2, templateId3],
            Array(3).fill(designatedWallet.address)
          );

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        let newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).not.to.include(templateId1);
        expect(templateIds).to.include(newTemplateId);
        expect(templateIds).to.eql([newTemplateId, templateId2, templateId3]);

        nextDapiIndex = await rrpDapiServer.nextDapiIndex();
        previousDapiId = await samplePriceDataFeed.latestDapiId();
        await expect(
          samplePriceDataFeed
            .connect(roles.anotherAdmin)
            .updateDapi(
              previousDapiId,
              [templateId1, templateId2, templateId3],
              Array(3).fill(designatedWallet.address)
            )
        ).to.emit(samplePriceDataFeed, 'DapiUpdated');

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).not.to.include(newTemplateId);
        expect(templateIds).to.include(templateId1);
        expect(templateIds).to.eql([templateId1, templateId2, templateId3]);
      });
    }
  );
});
