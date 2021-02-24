const { createTemplate } = require('./helpers/template');
const { createProvider } = require('./helpers/provider');

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

describe('createTemplate', function () {
  it('creates template', async function () {
    const provider = await createProvider(airnode, roles.providerAdmin);
    const providerId = provider.providerId;
    const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
    const parameters = ethers.utils.randomBytes(8);
    await createTemplate(airnode, providerId, endpointId, parameters);
  });
});
