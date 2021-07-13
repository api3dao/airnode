/* globals ethers */

const { expect } = require('chai');

let airnodeRrp;
const airnodeId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const parameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
const templateId = ethers.utils.keccak256(
  ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [airnodeId, endpointId, parameters])
);

beforeEach(async () => {
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp');
  airnodeRrp = await airnodeRrpFactory.deploy();
});

describe('createTemplate', function () {
  it('creates template', async function () {
    await expect(airnodeRrp.createTemplate(airnodeId, endpointId, parameters))
      .to.emit(airnodeRrp, 'TemplateCreated')
      .withArgs(templateId, airnodeId, endpointId, parameters);
  });
});

describe('getTemplate', function () {
  it('gets template', async function () {
    await airnodeRrp.createTemplate(airnodeId, endpointId, parameters);
    const template = await airnodeRrp.getTemplate(templateId);
    expect(template.airnodeId).to.equal(airnodeId);
    expect(template.endpointId).to.equal(endpointId);
    expect(template.parameters).to.equal(parameters);
  });
});
