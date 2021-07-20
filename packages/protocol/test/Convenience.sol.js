/* globals context ethers */

const { expect } = require('chai');
const { addressToDerivationPath } = require('./utils');

let airnodeRrp;
let roles;
let airnodeXpub, airnodeId, masterWallet, designatedWallet;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    requesterAdmin: accounts[1],
    randomPerson: accounts[9],
  };
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  // Generate the Airnode private key and derive the related parameters
  const airnodeWallet = ethers.Wallet.createRandom();
  const airnodeMnemonic = airnodeWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(airnodeMnemonic);
  airnodeXpub = hdNode.neuter().extendedKey;
  masterWallet = new ethers.Wallet(hdNode.privateKey, waffle.provider);
  airnodeId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
  const derivationPath = addressToDerivationPath(roles.requesterAdmin.address);
  designatedWallet = ethers.Wallet.fromMnemonic(airnodeMnemonic, `m/0/${derivationPath}`).connect(waffle.provider);
  // Fund the Airnode master wallet for it to be able to set the Airnode parameters
  await roles.deployer.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('1'),
  });
});

describe('getAirnodeParametersAndBlockNumber', function () {
  it('gets the Airnode parameters and the block number', async function () {
    // Generate random addresses as the authorizer contracts
    const authorizers = Array.from({ length: 5 }, () =>
      ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
    );
    // Set Airnode parameters
    await airnodeRrp.connect(masterWallet).setAirnodeParameters(airnodeXpub, authorizers, { gasLimit: 500000 });
    // Get the Airnode parameters and verify its fields
    const airnodeParametersAndBlockNumber = await airnodeRrp.getAirnodeParametersAndBlockNumber(airnodeId);
    expect(airnodeParametersAndBlockNumber.admin).to.equal(masterWallet.address);
    expect(airnodeParametersAndBlockNumber.xpub).to.equal(airnodeXpub);
    expect(airnodeParametersAndBlockNumber.authorizers).to.deep.equal(authorizers);
    expect(airnodeParametersAndBlockNumber.blockNumber).to.equal(await waffle.provider.getBlockNumber());
  });
});

describe('getTemplates', function () {
  it('gets templates', async function () {
    // Create the templates
    const noTemplates = 10;
    const airnodeIds = Array.from({ length: noTemplates }, () => ethers.utils.hexlify(ethers.utils.randomBytes(32)));
    const endpointIds = Array.from({ length: noTemplates }, () => ethers.utils.hexlify(ethers.utils.randomBytes(32)));
    const parameters = Array.from({ length: noTemplates }, () => ethers.utils.hexlify(ethers.utils.randomBytes(32)));
    const templateIds = [];
    for (let i = 0; i < noTemplates; i++) {
      templateIds.push(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes'],
            [airnodeIds[i], endpointIds[i], parameters[i]]
          )
        )
      );
      await airnodeRrp.createTemplate(airnodeIds[i], endpointIds[i], parameters[i]);
    }
    // Get the templates and verify them
    const templates = await airnodeRrp.getTemplates(templateIds);
    expect(templates.airnodeIds.length).to.equal(noTemplates);
    expect(templates.endpointIds.length).to.equal(noTemplates);
    expect(templates.parameters.length).to.equal(noTemplates);
    for (let i = 0; i < noTemplates; i++) {
      expect(templates.airnodeIds[i]).to.equal(airnodeIds[i]);
      expect(templates.endpointIds[i]).to.equal(endpointIds[i]);
      expect(templates.parameters[i]).to.equal(parameters[i]);
    }
  });
});

describe('checkAuthorizationStatuses', function () {
  context('Parameter lengths are equal', async function () {
    it('returns authorization statuses', async function () {
      const authorizers = [ethers.constants.AddressZero];
      // Set Airnode parameters
      await airnodeRrp.connect(masterWallet).setAirnodeParameters(airnodeXpub, authorizers, { gasLimit: 500000 });
      // Check authorization statuses
      const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const requester = roles.requesterAdmin.address;
      const clientAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
      const noRequests = 10;
      const authorizationStatuses = await airnodeRrp.checkAuthorizationStatuses(
        airnodeId,
        Array(noRequests).fill(requestId),
        Array(noRequests).fill(endpointId),
        Array(noRequests).fill(requester),
        Array(noRequests).fill(designatedWallet.address),
        Array(noRequests).fill(clientAddress)
      );
      for (const authorizationStatus of authorizationStatuses) {
        expect(authorizationStatus).to.equal(true);
      }
    });
  });
  context('Parameter lengths are not equal', async function () {
    it('reverts', async function () {
      const authorizers = [ethers.constants.AddressZero];
      // Set Airnode parameters
      await airnodeRrp.connect(masterWallet).setAirnodeParameters(airnodeXpub, authorizers, { gasLimit: 500000 });
      // Check authorization statuses
      const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const requester = roles.requesterAdmin.address;
      const clientAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
      const noRequests = 10;
      await expect(
        airnodeRrp.checkAuthorizationStatuses(
          airnodeId,
          Array(noRequests - 1).fill(requestId),
          Array(noRequests).fill(endpointId),
          Array(noRequests).fill(requester),
          Array(noRequests).fill(designatedWallet.address),
          Array(noRequests).fill(clientAddress)
        )
      ).to.be.revertedWith('Unequal parameter lengths');
    });
  });
});
