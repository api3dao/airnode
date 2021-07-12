/* globals context ethers */

const { expect } = require('chai');

let airnodeRrpClient;
let roles;
const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const fulfillStatusCode = 0;
const fulfillData = ethers.utils.hexlify(ethers.utils.randomBytes(32));

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    airnodeRrp: accounts[1],
    randomPerson: accounts[9],
  };
  const airnodeRrpClientFactory = await ethers.getContractFactory('MockAirnodeRrpClient', roles.deployer);
  airnodeRrpClient = await airnodeRrpClientFactory.deploy(roles.airnodeRrp.address);
});

describe('constructor', function () {
  it('initializes with the correct parameter', async function () {
    expect(await airnodeRrpClient.airnodeRrp()).to.equal(roles.airnodeRrp.address);
  });
});

describe('onlyAirnodeRrp', function () {
  context('Caller is the Airnode RRP contract', async function () {
    it('does not revert', async function () {
      await expect(
        airnodeRrpClient.connect(roles.airnodeRrp).fulfill(requestId, fulfillStatusCode, fulfillData)
      ).to.not.be.revertedWith('Caller not Airnode RRP');
    });
  });
  context('Caller is not the Airnode RRP contract', async function () {
    it('reverts', async function () {
      await expect(
        airnodeRrpClient.connect(roles.randomPerson).fulfill(requestId, fulfillStatusCode, fulfillData)
      ).to.be.revertedWith('Caller not Airnode RRP');
    });
  });
});
