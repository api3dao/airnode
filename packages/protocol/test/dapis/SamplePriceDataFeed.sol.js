const { expect } = require('chai');

const AdminStatus = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
};

const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const templateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
const requesterIndex = 1;

let roles;
let airnodeRrp, rrpDapiServer, samplePriceDataFeed;
let airnodeId, masterWallet, designatedWallet;
let templateId;

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
  await airnodeRrp.createTemplate(airnodeId, endpointId, templateParameters);
  templateId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [airnodeId, endpointId, templateParameters])
  );
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
      // Register DApi
      await rrpDapiServer.registerDapi(
        1 /* noResponsesToReduce */,
        10 /* toleranceInPercentages */,
        1 /* requesterIndex */,
        [templateId],
        [designatedWallet.address],
        samplePriceDataFeed.address /* reduceAddress */,
        samplePriceDataFeed.interface.getSighash('reduce') /* reduceFunctionId */,
        ethers.constants.AddressZero /* requestIndexResetter */
      );

      const currentDapiId; // TODO: HOW DO I GET THE RETURN VALUE FROM PREVIOUS TX???

      // await airnodeRrp.createTemplate(airnodeId, endpointId, templateParameters);
      // const newTemplateId = ethers.utils.keccak256(
      //   ethers.utils.defaultAbiCoder.encode(
      //     ['bytes32', 'bytes32', 'bytes'],
      //     [airnodeId, endpointId, templateParameters]
      //   )
      // );

      await samplePriceDataFeed.connect(roles.requesterAdmin).addTemplate(currentDapiId, templateId);

      expect(await samplePriceDataFeed.latestDapiId()).not.to.eq(currentDapiId);
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
