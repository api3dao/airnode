const { expect } = require('chai');
const { createProvider } = require('./helpers/provider');

let airnode;
let roles;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    providerAdmin: accounts[1],
    randomPerson: accounts[9],
  };
  const airnodeFactory = await ethers.getContractFactory('Airnode', roles.deployer);
  airnode = await airnodeFactory.deploy();
});

describe('updateEndpointAuthorizers', function () {
  context('If the caller is the provider admin', async function () {
    it('updates the endpoint authorizers', async function () {
      let providerId;
      ({ providerId } = await createProvider(airnode, roles.providerAdmin));
      const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
      const authorizers = [
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
        '0x0000000000000000000000000000000000000003',
      ];
      await expect(airnode.connect(roles.providerAdmin).updateEndpointAuthorizers(providerId, endpointId, authorizers))
        .to.emit(airnode, 'EndpointUpdated')
        .withArgs(providerId, endpointId, authorizers);
      const retrievedAuthorizers = await airnode.getEndpointAuthorizers(providerId, endpointId);
      expect(retrievedAuthorizers).to.eql(authorizers);
    });
  });
  context('If the caller is not the provider admin', async function () {
    it('reverts', async function () {
      let providerId;
      ({ providerId } = await createProvider(airnode, roles.providerAdmin));
      const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
      const authorizers = [
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
        '0x0000000000000000000000000000000000000003',
      ];
      await expect(
        airnode.connect(roles.randomPerson).updateEndpointAuthorizers(providerId, endpointId, authorizers)
      ).to.be.revertedWith('Caller is not provider admin');
    });
  });
});
