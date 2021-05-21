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
  // Register dapi
  const tx = await rrpDapiServer.registerDapi(
    1 /* noResponsesToReduce */,
    10 /* toleranceInPercentages */,
    requesterIndex,
    [templateId1, templateId2, templateId3],
    [designatedWallet.address, designatedWallet.address, designatedWallet.address],
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

describe('addTemplate', function () {
  context('Caller is an admin', function () {
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
      await samplePriceDataFeed
        .connect(roles.admin)
        .addTemplate(previousDapiId, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).to.include(newTemplateId);
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
      await samplePriceDataFeed
        .connect(roles.superAdmin)
        .addTemplate(previousDapiId, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).to.include(newTemplateId);
    });
  });
  context('Caller is the meta admin', function () {
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
      await samplePriceDataFeed
        .connect(roles.superAdmin)
        .addTemplate(previousDapiId, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).to.include(newTemplateId);
    });
  });
  context('Caller is unauthorized', function () {
    it('reverts', async function () {
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
          .addTemplate(previousDapiId, newTemplateId, designatedWallet.address)
      ).to.be.revertedWith('Unauthorized');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      const [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.have.same.members([templateId1, templateId2, templateId3]);
    });
  });
  context('Caller has updated the dapi and cooldown period has elapsed', function () {
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
      await samplePriceDataFeed.connect(roles.admin).addTemplate(previousDapiId, templateId1, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).to.include(templateId1);

      // Time travel
      const days = 2;
      ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
      ethers.provider.send('evm_mine');

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
      await samplePriceDataFeed.connect(roles.admin).addTemplate(previousDapiId, templateId2, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).to.include(templateId2);
    });
  });
  context('Caller has updated the dapi within cooldown period', function () {
    it('reverts', async function () {
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
        .addTemplate(previousDapiId, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).to.include(newTemplateId);

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed.connect(roles.admin).addTemplate(previousDapiId, newTemplateId, designatedWallet.address)
      ).to.be.revertedWith('Cooldown period has not finished');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.have.same.members([templateId1, templateId2, templateId3, newTemplateId]);
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
          .addTemplate(previousDapiId, templateId1, designatedWallet.address);

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        let newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).to.include(templateId1);

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
          .addTemplate(previousDapiId, templateId2, designatedWallet.address);

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).to.include(templateId2);
      });
    }
  );
});

describe('removeTemplate', function () {
  context('Caller is an admin', function () {
    it('removes a templateId from dapi (begining of array)', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.admin).removeTemplate(previousDapiId, templateId1);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.have.same.members([templateId2, templateId3]);
    });
    it('removes a templateId from dapi (middle of array)', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.admin).removeTemplate(previousDapiId, templateId2);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId2);
      expect(templateIds).to.have.same.members([templateId1, templateId3]);
    });
    it('removes a templateId from dapi (end of array)', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.admin).removeTemplate(previousDapiId, templateId3);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId3);
      expect(templateIds).to.have.same.members([templateId1, templateId2]);
    });
    it('reverts if templateId was not found', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const templateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, endpointId, templateParameters);
      const templateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, endpointId, templateParameters]
        )
      );
      await expect(
        samplePriceDataFeed.connect(roles.admin).removeTemplate(previousDapiId, templateId)
      ).to.be.revertedWith('TemplateId was not found');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      const [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.have.same.members([templateId1, templateId2, templateId3]);
    });
  });
  context('Caller is an super admin', function () {
    it('removes a templateId from dapi', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.superAdmin).removeTemplate(previousDapiId, templateId1);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.have.same.members([templateId2, templateId3]);
    });
  });
  context('Caller is the meta admin', function () {
    it('removes a templateId from dapi', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.metaAdmin).removeTemplate(previousDapiId, templateId1);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.have.same.members([templateId2, templateId3]);
    });
  });
  context('Caller is unauthorized', function () {
    it('reverts', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed.connect(roles.randomPerson).removeTemplate(previousDapiId, templateId1)
      ).to.be.revertedWith('Unauthorized');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      const [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.have.same.members([templateId1, templateId2, templateId3]);
    });
  });
  context('Caller has updated the dapi and cooldown period has elapsed', function () {
    it('removes a templateId from dapi', async function () {
      let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      let previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.admin).removeTemplate(previousDapiId, templateId1);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.have.same.members([templateId2, templateId3]);

      // Time travel
      const days = 2;
      ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
      ethers.provider.send('evm_mine');

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.admin).removeTemplate(previousDapiId, templateId2);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId2);
      expect(templateIds).to.have.same.members([templateId3]);
    });
  });
  context('Caller has updated the dapi within cooldown period', function () {
    it('reverts', async function () {
      let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      let previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.admin).removeTemplate(previousDapiId, templateId1);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed.connect(roles.admin).removeTemplate(previousDapiId, templateId2)
      ).to.be.revertedWith('Cooldown period has not finished');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.have.same.members([templateId2, templateId3]);
    });
  });
  context(
    'Caller has updated the dapi and cooldown period has not elapsed but a different admin is also trying to update the dapi',
    function () {
      it('removes a templateId from dapi', async function () {
        let nextDapiIndex = await rrpDapiServer.nextDapiIndex();
        let previousDapiId = await samplePriceDataFeed.latestDapiId();
        await samplePriceDataFeed.connect(roles.admin).removeTemplate(previousDapiId, templateId1);

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        let newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).not.to.include(templateId1);

        nextDapiIndex = await rrpDapiServer.nextDapiIndex();
        previousDapiId = await samplePriceDataFeed.latestDapiId();
        await samplePriceDataFeed.connect(roles.anotherAdmin).removeTemplate(previousDapiId, templateId2);

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).not.to.include(templateId2);
        expect(templateIds).to.have.same.members([templateId3]);
      });
    }
  );
});

describe('updateTemplate', function () {
  context('Caller is an admin', function () {
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
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateTemplate(previousDapiId, templateId1, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.have.same.members([newTemplateId, templateId2, templateId3]);
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
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateTemplate(previousDapiId, templateId2, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId2);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.have.same.members([templateId1, newTemplateId, templateId3]);
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
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateTemplate(previousDapiId, templateId3, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId3);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.have.same.members([templateId1, templateId2, newTemplateId]);
    });
    it('reverts if templateId was not found', async function () {
      const nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const templateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
      await airnodeRrp.createTemplate(airnodeId, endpointId, templateParameters);
      const templateId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes'],
          [airnodeId, endpointId, templateParameters]
        )
      );
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateTemplate(previousDapiId, templateId, templateId1, designatedWallet.address)
      ).to.be.revertedWith('TemplateId was not found');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      const [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.have.same.members([templateId1, templateId2, templateId3]);
    });
  });
  context('Caller is an super admin', function () {
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
      await samplePriceDataFeed
        .connect(roles.superAdmin)
        .updateTemplate(previousDapiId, templateId1, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.have.same.members([newTemplateId, templateId2, templateId3]);
    });
  });
  context('Caller is the meta admin', function () {
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
      await samplePriceDataFeed
        .connect(roles.metaAdmin)
        .updateTemplate(previousDapiId, templateId1, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.have.same.members([newTemplateId, templateId2, templateId3]);
    });
  });
  context('Caller is unauthorized', function () {
    it('reverts', async function () {
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
          .updateTemplate(previousDapiId, templateId1, newTemplateId, designatedWallet.address)
      ).to.be.revertedWith('Unauthorized');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      const [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.have.same.members([templateId1, templateId2, templateId3]);
    });
  });
  context('Caller has updated the dapi and cooldown period has elapsed', function () {
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
        .updateTemplate(previousDapiId, templateId1, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.have.same.members([newTemplateId, templateId2, templateId3]);

      // Time travel
      const days = 2;
      ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
      ethers.provider.send('evm_mine');

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed
        .connect(roles.admin)
        .updateTemplate(previousDapiId, newTemplateId, templateId1, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(newTemplateId);
      expect(templateIds).to.include(templateId1);
      expect(templateIds).to.have.same.members([templateId1, templateId2, templateId3]);
    });
  });
  context('Caller has updated the dapi within cooldown period', function () {
    it('reverts', async function () {
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
        .updateTemplate(previousDapiId, templateId1, newTemplateId, designatedWallet.address);

      expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
      let newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);
      let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
      expect(templateIds).to.include(newTemplateId);
      expect(templateIds).to.have.same.members([newTemplateId, templateId2, templateId3]);

      nextDapiIndex = await rrpDapiServer.nextDapiIndex();
      previousDapiId = await samplePriceDataFeed.latestDapiId();
      await expect(
        samplePriceDataFeed
          .connect(roles.admin)
          .updateTemplate(previousDapiId, newTemplateId, templateId1, designatedWallet.address)
      ).to.be.revertedWith('Cooldown period has not finished');
      expect(nextDapiIndex).to.eq(await rrpDapiServer.nextDapiIndex());
      [, , , templateIds] = await rrpDapiServer.getDapi(await samplePriceDataFeed.latestDapiId());
      expect(templateIds).to.have.same.members([newTemplateId, templateId2, templateId3]);
    });
  });
  context(
    'Caller has updated the dapi and cooldown period has not elapsed but a different admin is also trying to update the dapi',
    function () {
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
          .updateTemplate(previousDapiId, templateId1, newTemplateId, designatedWallet.address);

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        let newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        let [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).not.to.include(templateId1);
        expect(templateIds).to.include(newTemplateId);
        expect(templateIds).to.have.same.members([newTemplateId, templateId2, templateId3]);

        nextDapiIndex = await rrpDapiServer.nextDapiIndex();
        previousDapiId = await samplePriceDataFeed.latestDapiId();
        await samplePriceDataFeed
          .connect(roles.anotherAdmin)
          .updateTemplate(previousDapiId, newTemplateId, templateId1, designatedWallet.address);

        expect(nextDapiIndex).to.eq((await rrpDapiServer.nextDapiIndex()) - 1);
        newDapiId = await samplePriceDataFeed.latestDapiId();
        expect(newDapiId).not.to.eq(previousDapiId);
        [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
        expect(templateIds).not.to.include(newTemplateId);
        expect(templateIds).to.include(templateId1);
        expect(templateIds).to.have.same.members([templateId1, templateId2, templateId3]);
      });
    }
  );
});
