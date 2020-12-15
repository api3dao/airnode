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

describe('createTemplate', function () {
  it('creates template', async function () {
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
    const parameters = ethers.utils.randomBytes(8);
    await createTemplate(
      airnode,
      providerId,
      endpointId,
      requesterIndex,
      designatedWallet,
      fulfillAddress,
      fulfillFunctionId,
      parameters
    );
  });
});
