const { expect } = require('chai');
const { createTemplate } = require('./helpers/template');
const { createProvider } = require('./helpers/provider');
const { createRequester } = require('./helpers/requester');
const { deriveWalletAddressFromPath } = require('./util');

let airnode;
let convenience;
let authorizer;
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
  const convenienceFactory = await ethers.getContractFactory('Convenience', roles.deployer);
  convenience = await convenienceFactory.deploy(airnode.address);
  const authorizerFactory = await ethers.getContractFactory('MinBalanceAuthorizer', roles.deployer);
  authorizer = await authorizerFactory.deploy(airnode.address);
});

describe('getProviderAndBlockNumber', function () {
  it('returns the provider and the block number', async function () {
    let providerXpub, providerId;
    ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
    // 34,175 gas
    const returnedValues = await convenience.getProviderAndBlockNumber(providerId);
    expect(returnedValues.admin).to.equal(roles.providerAdmin.address);
    expect(returnedValues.xpub).to.equal(providerXpub);
    expect(returnedValues.blockNumber).to.equal(await waffle.provider.getBlockNumber());
  });
});

describe('getTemplates', function () {
  it('returns templates', async function () {
    let providerXpub, providerId;
    ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
    const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
    const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
    const designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterIndex.toString()}`);
    const fulfillAddress = '0x0000000000000000000000000000000000000123';
    const fulfillFunctionId = ethers.utils.hexDataSlice(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('myFunction(bytes32,uint256,bytes32)')),
      0,
      4
    );
    const parameters = ethers.utils.randomBytes(32);
    const templateId = await createTemplate(
      airnode,
      providerId,
      endpointId,
      requesterIndex,
      designatedWallet,
      fulfillAddress,
      fulfillFunctionId,
      parameters
    );
    // 196,593 gas
    const noTemplates = 10;
    const templates = await convenience.getTemplates(Array(noTemplates).fill(templateId));
    for (var ind = 0; ind < noTemplates; ind++) {
      expect(templates.providerIds[ind]).to.equal(providerId);
      expect(templates.endpointIds[ind]).to.equal(endpointId);
      expect(templates.requesterIndices[ind]).to.equal(requesterIndex);
      expect(templates.designatedWallets[ind]).to.equal(designatedWallet);
      expect(templates.fulfillAddresses[ind]).to.equal(fulfillAddress);
      expect(templates.fulfillFunctionIds[ind]).to.equal(fulfillFunctionId);
      expect(templates.parameters[ind]).to.equal(ethers.utils.hexlify(parameters));
    }
  });
});

describe('checkAuthorizationStatus', function () {
  it('returns the authorization status', async function () {
    let providerXpub, providerId;
    ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
    const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
    const noAuthorizers = 10;
    await airnode
      .connect(roles.providerAdmin)
      .updateEndpointAuthorizers(providerId, endpointId, Array(noAuthorizers).fill(authorizer.address));
    const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
    const designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterIndex.toString()}`);
    // 91,529 gas
    const authorizationStatus = await convenience.checkAuthorizationStatus(
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
    const noAuthorizers = 10;
    await airnode
      .connect(roles.providerAdmin)
      .updateEndpointAuthorizers(providerId, endpointId, Array(noAuthorizers).fill(authorizer.address));
    const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
    const designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterIndex.toString()}`);
    // 722,267 gas
    const noRequests = 10;
    const authorizationStatuses = await convenience.checkAuthorizationStatuses(
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
