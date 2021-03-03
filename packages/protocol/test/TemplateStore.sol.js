const { expect } = require('chai');

let airnode;
const providerId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const parameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
const templateId = ethers.utils.keccak256(
  ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [providerId, endpointId, parameters])
);

beforeEach(async () => {
  const airnodeFactory = await ethers.getContractFactory('Airnode');
  airnode = await airnodeFactory.deploy();
});

describe('createTemplate', function () {
  it('creates template', async function () {
    await expect(airnode.createTemplate(providerId, endpointId, parameters))
      .to.emit(airnode, 'TemplateCreated')
      .withArgs(templateId, providerId, endpointId, parameters);
  });
});

describe('getTemplate', function () {
  it('gets template', async function () {
    await airnode.createTemplate(providerId, endpointId, parameters);
    const template = await airnode.getTemplate(templateId);
    expect(template.providerId).to.equal(providerId);
    expect(template.endpointId).to.equal(endpointId);
    expect(template.parameters).to.equal(parameters);
  });
});
