const { verifyLog } = require('../util');

async function createTemplate(
  airnode,
  providerId,
  endpointId,
  requesterInd,
  designatedWallet,
  fulfillAddress,
  fulfillFunctionId,
  parameters
) {
  const expectedTemplateId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'uint256', 'address', 'address', 'bytes4', 'bytes'],
      [providerId, endpointId, requesterInd, designatedWallet, fulfillAddress, fulfillFunctionId, parameters]
    )
  );
  const tx = await airnode.createTemplate(
    providerId,
    endpointId,
    requesterInd,
    designatedWallet,
    fulfillAddress,
    fulfillFunctionId,
    parameters
  );
  await verifyLog(airnode, tx, 'TemplateCreated(bytes32,bytes32,bytes32,uint256,address,address,bytes4,bytes)', {
    templateId: expectedTemplateId,
    providerId,
    endpointId,
    requesterInd,
    designatedWallet,
    fulfillAddress,
    fulfillFunctionId,
    parameters: ethers.utils.hexlify(parameters),
  });
  return expectedTemplateId;
}

module.exports = {
  createTemplate: createTemplate,
};
