const { expect } = require('chai');
const { createTemplate } = require('./helpers/template');
const { createProvider } = require('./helpers/provider');
const { createRequester } = require('./helpers/requester');
const { deriveWalletAddressFromPath } = require('./util');

let airnode;
let roles;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    providerAdmin: accounts[1],
    requesterAdmin: accounts[2],
    randomPerson: accounts[9],
  };
  const airnodeFactory = await ethers.getContractFactory('Airnode', roles.deployer);
  airnode = await airnodeFactory.deploy();
});

describe('getProviderAndBlockNumber', function () {
  it('returns the provider and the block number', async function () {
    let providerXpub, providerId;
    ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
    // 34,175 gas
    const returnedValues = await airnode.getProviderAndBlockNumber(providerId);
    expect(returnedValues.admin).to.equal(roles.providerAdmin.address);
    expect(returnedValues.xpub).to.equal(providerXpub);
    expect(returnedValues.blockNumber).to.equal(await waffle.provider.getBlockNumber());
  });
});

describe('getTemplates', function () {
  it('returns templates', async function () {
    const provider = await createProvider(airnode, roles.providerAdmin);
    const providerId = provider.providerId;
    const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
    const parameters = ethers.utils.randomBytes(32);
    const templateId = await createTemplate(airnode, providerId, endpointId, parameters);
    // 196,593 gas
    const noTemplates = 10;
    const templates = await airnode.getTemplates(Array(noTemplates).fill(templateId));
    for (var ind = 0; ind < noTemplates; ind++) {
      expect(templates.providerIds[ind]).to.equal(providerId);
      expect(templates.endpointIds[ind]).to.equal(endpointId);
      expect(templates.parameters[ind]).to.equal(ethers.utils.hexlify(parameters));
    }
  });
});

describe('checkAuthorizationStatus', function () {
  it('returns the authorization status', async function () {
    let providerXpub, providerId;
    ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
    const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
    const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
    const designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterIndex.toString()}`);
    // 91,529 gas
    const authorizationStatus = await airnode.checkAuthorizationStatus(
      providerId,
      ethers.constants.HashZero,
      endpointId,
      0,
      designatedWallet,
      ethers.constants.AddressZero
    );
    expect(authorizationStatus).to.equal(true);
  });
});

describe('checkAuthorizationStatuses', function () {
  it('returns authorization statuses', async function () {
    let providerXpub, providerId;
    ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
    const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
    const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
    const designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterIndex.toString()}`);
    // 722,267 gas
    const noRequests = 10;
    const authorizationStatuses = await airnode.checkAuthorizationStatuses(
      providerId,
      Array(noRequests).fill(ethers.constants.HashZero),
      Array(noRequests).fill(endpointId),
      Array(noRequests).fill(0),
      Array(noRequests).fill(designatedWallet),
      Array(noRequests).fill(ethers.constants.AddressZero)
    );
    for (const authorizationStatus of authorizationStatuses) {
      expect(authorizationStatus).to.equal(true);
    }
  });
});
