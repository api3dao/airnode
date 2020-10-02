const { expect } = require('chai');
const { createTemplate } = require('./helpers/template');
const { createProvider } = require('./helpers/provider');
const { createRequester } = require('./helpers/requester');
const { makeRequest, makeShortRequest, makeFullRequest } = require('./helpers/request');
const { deriveWalletAddressFromPath } = require('./util');

let airnode;
let airnodeClient;
let roles;
let providerXpub;
let providerId;
let endpointId;
let requesterInd;
let designatedWallet;
let fulfillAddress;
let fulfillFunctionId;
let parameters;
let templateId;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    providerAdmin: accounts[1],
    requesterAdmin: accounts[2],
    clientUser: accounts[3],
    randomPerson: accounts[9],
  };
  const airnodeFactory = await ethers.getContractFactory('Airnode', roles.deployer);
  airnode = await airnodeFactory.deploy();
  const airnodeClientFactory = await ethers.getContractFactory('MockAirnodeClient', roles.deployer);
  airnodeClient = await airnodeClientFactory.deploy(airnode.address);

  ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
  endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
  requesterInd = await createRequester(airnode, roles.requesterAdmin);
  designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterInd.toString()}`);
  fulfillAddress = airnodeClient.address;
  fulfillFunctionId = ethers.utils.hexDataSlice(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes('fulfill(bytes32,uint256,bytes32)')),
    0,
    4
  );
  parameters = ethers.utils.randomBytes(8);
  templateId = await createTemplate(
    airnode,
    providerId,
    endpointId,
    requesterInd,
    designatedWallet,
    fulfillAddress,
    fulfillFunctionId,
    parameters
  );
});

describe('makeRequest', function () {
  context('If the client is endorsed by the requester', async function () {
    it('makes a regular request', async function () {
      const requestTimeRequesterInd = await createRequester(airnode, roles.requesterAdmin);
      const requestTimeDesignatedWallet = deriveWalletAddressFromPath(
        providerXpub,
        `m/0/${requestTimeRequesterInd.toString()}`
      );
      const airnodeClientFactory = await ethers.getContractFactory('MockAirnodeClient', roles.deployer);
      const requestTimeAirnodeClient = await airnodeClientFactory.deploy(airnode.address);
      const requestTimeFulfillAddress = requestTimeAirnodeClient.address;
      const requestTimeParameters = ethers.utils.randomBytes(16);

      await makeRequest(
        airnode,
        requestTimeAirnodeClient,
        roles.requesterAdmin,
        roles.clientUser,
        templateId,
        providerId,
        requestTimeRequesterInd,
        requestTimeDesignatedWallet,
        requestTimeFulfillAddress,
        fulfillFunctionId,
        requestTimeParameters
      );
    });
  });
  context('If the client is not endorsed by the requester', async function () {
    it('reverts', async function () {
      await expect(
        airnodeClient
          .connect(roles.clientUser)
          .makeRequest(templateId, requesterInd, designatedWallet, fulfillAddress, fulfillFunctionId, parameters)
      ).to.be.revertedWith('Client not endorsed by requester');
    });
  });
});

describe('makeShortRequest', function () {
  context('If the client is endorsed by the requester', async function () {
    it('makes a short request', async function () {
      const requestTimeParameters = ethers.utils.randomBytes(16);

      await makeShortRequest(
        airnode,
        airnodeClient,
        roles.requesterAdmin,
        roles.clientUser,
        templateId,
        providerId,
        requesterInd,
        requestTimeParameters
      );
    });
  });
  context('If the client is not endorsed by the requester', async function () {
    it('reverts', async function () {
      await expect(airnodeClient.connect(roles.clientUser).makeShortRequest(templateId, parameters)).to.be.revertedWith(
        'Client not endorsed by requester'
      );
    });
  });
});

describe('makeFullRequest', function () {
  context('If the client is endorsed by the requester', async function () {
    it('makes a full request', async function () {
      const requestTimeParameters = ethers.utils.randomBytes(16);

      await makeFullRequest(
        airnode,
        airnodeClient,
        roles.requesterAdmin,
        roles.clientUser,
        providerId,
        endpointId,
        requesterInd,
        designatedWallet,
        fulfillAddress,
        fulfillFunctionId,
        requestTimeParameters
      );
    });
  });
  context('If the client is not endorsed by the requester', async function () {
    it('reverts', async function () {
      await expect(
        airnodeClient
          .connect(roles.clientUser)
          .makeFullRequest(
            providerId,
            endpointId,
            requesterInd,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
          )
      ).to.be.revertedWith('Client not endorsed by requester');
    });
  });
});
