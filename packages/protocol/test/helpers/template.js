const { verifyLog } = require('../util');

async function createTemplate(airnode, providerId, endpointId, parameters) {
  const expectedTemplateId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [providerId, endpointId, parameters])
  );
  const tx = await airnode.createTemplate(providerId, endpointId, parameters);
  await verifyLog(airnode, tx, 'TemplateCreated(bytes32,bytes32,bytes32,bytes)', {
    templateId: expectedTemplateId,
    providerId,
    endpointId,
    parameters: ethers.utils.hexlify(parameters),
  });
  return expectedTemplateId;
}

module.exports = {
  createTemplate: createTemplate,
};
