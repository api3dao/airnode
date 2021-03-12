const { expect } = require('chai');

let airnodeRrp;
const providerId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const parameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
const templateId = ethers.utils.keccak256(
  ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [providerId, endpointId, parameters])
);

beforeEach(async () => {
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp');
  airnodeRrp = await airnodeRrpFactory.deploy();
});

describe('createTemplate', function () {
  it('creates template', async function () {
    await expect(airnodeRrp.createTemplate(providerId, endpointId, parameters))
      .to.emit(airnodeRrp, 'TemplateCreated')
      .withArgs(templateId, providerId, endpointId, parameters);
  });
});

describe('getTemplate', function () {
  it('gets template', async function () {
    await airnodeRrp.createTemplate(providerId, endpointId, parameters);
    const template = await airnodeRrp.getTemplate(templateId);
    expect(template.providerId).to.equal(providerId);
    expect(template.endpointId).to.equal(endpointId);
    expect(template.parameters).to.equal(parameters);
  });
});
