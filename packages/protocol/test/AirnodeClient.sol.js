const { expect } = require('chai');

let airnodeClient;
let roles;
const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const fulfillStatusCode = 0;
const fulfillData = ethers.utils.hexlify(ethers.utils.randomBytes(32));

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    airnode: accounts[1],
    randomPerson: accounts[9],
  };
  const airnodeClientFactory = await ethers.getContractFactory('MockAirnodeClient', roles.deployer);
  airnodeClient = await airnodeClientFactory.deploy(roles.airnode.address);
});

describe('constructor', function () {
  it('initializes with the correct parameter', async function () {
    expect(await airnodeClient.airnodeAddress()).to.equal(roles.airnode.address);
  });
});

describe('onlyAirnode', function () {
  context('Caller is the Airnode contract', async function () {
    it('does not revert', async function () {
      await expect(
        airnodeClient.connect(roles.airnode).fulfill(requestId, fulfillStatusCode, fulfillData)
      ).to.not.be.revertedWith('Caller not the Airnode contract');
    });
  });
  context('Caller is not the Airnode contract', async function () {
    it('reverts', async function () {
      await expect(
        airnodeClient.connect(roles.randomPerson).fulfill(requestId, fulfillStatusCode, fulfillData)
      ).to.be.revertedWith('Caller not the Airnode contract');
    });
  });
});
