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
    airnodeAdmin,
    requesterAdmin,
    clientUser,
    randomPerson,
    ...otherAccounts
  ] = await ethers.getSigners();
  roles = {
    deployer,
    airnodeAdmin,
    requesterAdmin,
    clientUser,
    randomPerson,
    otherAccounts,
  };
  // Deploy contracts
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const rrpDapiServerFactory = await ethers.getContractFactory('RrpDapiServer', roles.deployer);
  rrpDapiServer = await rrpDapiServerFactory.deploy(airnodeRrp.address);
  const samplePriceDataFeedFactory = await ethers.getContractFactory('SamplePriceDataFeed', roles.deployer);
  samplePriceDataFeed = await samplePriceDataFeedFactory.deploy(rrpDapiServer.address, roles.airnodeAdmin.address);
  // Set airnodeRequester as admin
  await samplePriceDataFeed.connect(roles.airnodeAdmin).setAdminStatus(roles.requesterAdmin.address, AdminStatus.Admin);
  // Create the requester
  await airnodeRrp.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin.address);
  // Generate the Airnode private key and derive the related parameters
  const requesterIndex = 1;
  const airnodeWallet = ethers.Wallet.createRandom();
  const airnodeMnemonic = airnodeWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(airnodeMnemonic);
  masterWallet = new ethers.Wallet(hdNode.privateKey, waffle.provider);
  airnodeId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
  designatedWallet = ethers.Wallet.fromMnemonic(airnodeMnemonic, `m/0/${requesterIndex}`).connect(waffle.provider);
  // Fund the Airnode master wallet for it to be able to set the Airnode parameters
  await roles.airnodeAdmin.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('1'),
  });
  // Fund the designated wallet so that it can be withdrawn from
  await roles.requesterAdmin.sendTransaction({
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
  templateId1 = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [airnodeId, endpointId1, templateParameters1])
  );
  await airnodeRrp.createTemplate(airnodeId, endpointId2, templateParameters2);
  templateId2 = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [airnodeId, endpointId2, templateParameters2])
  );
  await airnodeRrp.createTemplate(airnodeId, endpointId3, templateParameters3);
  templateId3 = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [airnodeId, endpointId3, templateParameters3])
  );
  // Register dapi
  const tx = await rrpDapiServer.registerDapi(
    1 /* noResponsesToReduce */,
    10 /* toleranceInPercentages */,
    1 /* requesterIndex */,
    [templateId1, templateId2, templateId3],
    [designatedWallet.address, designatedWallet.address, designatedWallet.address],
    samplePriceDataFeed.address /* reduceAddress */,
    samplePriceDataFeed.interface.getSighash('reduce') /* reduceFunctionId */,
    ethers.constants.AddressZero /* requestIndexResetter */
  );
  // Get dapiId and set it on SamplePriceDataFeed
  const { events } = await tx.wait();
  const [dapiId] = events.filter((e) => e.event == 'DapiRegistered').map((e) => e.args[0]);
  await samplePriceDataFeed.connect(roles.airnodeAdmin).setDapi(dapiId);
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
        samplePriceDataFeedFactory.deploy(ethers.constants.AddressZero, roles.airnodeAdmin.address)
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

      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.requesterAdmin).addTemplate(previousDapiId, newTemplateId);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);

      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).to.include(newTemplateId);
    });
  });
  context('Caller is an super admin', function () {
    it('adds a new templateId to dapi', function () {});
  });
  context('Caller is the meta admin', function () {
    it('adds a new templateId to dapi', function () {});
  });
  context('Caller is unauthorized', function () {
    it('reverts', function () {});
  });
  context('Admin has never updated the dapi', function () {
    it('adds a new templateId to dapi', function () {});
  });
  context('Admin has updated the dapi and cooldown period has elapsed', function () {
    it('adds a new templateId to dapi', function () {});
  });
  context('Admin has updated the dapi but still within cooldown period', function () {
    it('reverts', function () {});
  });
  context(
    'Admin has updated the dapi and cooldown period has not elapsed but a different admin is trying to update the dapi',
    function () {
      it('adds a new templateId to dapi', function () {});
    }
  );
});

describe('removeTemplate', function () {
  context('Caller is an admin', function () {
    it('removes a templateId from dapi (begining of array)', async function () {
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.requesterAdmin).removeTemplate(previousDapiId, templateId1);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);

      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId1);
    });
    it('removes a templateId from dapi (middle of array)', async function () {
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.requesterAdmin).removeTemplate(previousDapiId, templateId2);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);

      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId2);
    });
    it('removes a templateId from dapi (end of array)', async function () {
      const previousDapiId = await samplePriceDataFeed.latestDapiId();
      await samplePriceDataFeed.connect(roles.requesterAdmin).removeTemplate(previousDapiId, templateId3);
      const newDapiId = await samplePriceDataFeed.latestDapiId();
      expect(newDapiId).not.to.eq(previousDapiId);

      const [, , , templateIds] = await rrpDapiServer.getDapi(newDapiId);
      expect(templateIds).not.to.include(templateId3);
    });
    it('reverts if templateId was not found', async function () {
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
        samplePriceDataFeed.connect(roles.requesterAdmin).removeTemplate(previousDapiId, templateId)
      ).to.be.revertedWith('TemplateId was not found');

      const [, , , templateIds] = await rrpDapiServer.getDapi(previousDapiId);
      expect(templateIds).not.equal([templateId1, templateId2, templateId3]);
    });
  });
});
