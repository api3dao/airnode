const { expect } = require('chai');
const { verifyLog } = require('../util');

async function makeRequest(
  airnode,
  requestTimeAirnodeClient,
  requesterAdminRole,
  clientUserRole,
  templateId,
  providerId,
  requestTimeRequesterIndex,
  requestTimeDesignatedWalletAddress,
  requestTimeFulfillAddress,
  requestTimeFulfillFunctionId,
  requestTimeParameters
) {
  await airnode
    .connect(requesterAdminRole)
    .updateClientEndorsementStatus(requestTimeRequesterIndex, requestTimeAirnodeClient.address, true);
  const tx = await requestTimeAirnodeClient
    .connect(clientUserRole)
    .makeRequest(
      templateId,
      requestTimeRequesterIndex,
      requestTimeDesignatedWalletAddress,
      requestTimeFulfillAddress,
      requestTimeFulfillFunctionId,
      requestTimeParameters
    );
  const log = await verifyLog(
    airnode,
    tx,
    'ClientRequestCreated(bytes32,bytes32,uint256,address,bytes32,uint256,address,address,bytes4,bytes)',
    {
      providerId,
      clientAddress: requestTimeFulfillAddress,
      templateId,
      requesterIndex: requestTimeRequesterIndex,
      designatedWallet: requestTimeDesignatedWalletAddress,
      fulfillAddress: requestTimeFulfillAddress,
      fulfillFunctionId: requestTimeFulfillFunctionId,
      parameters: ethers.utils.hexlify(requestTimeParameters),
    }
  );
  const expectedRequestId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'bytes32', 'bytes32', 'bytes'],
      [log.args.noRequests, requestTimeFulfillAddress, providerId, templateId, requestTimeParameters]
    )
  );
  expect(expectedRequestId).to.equal(log.args.requestId);
  return expectedRequestId;
}

async function makeShortRequest(
  airnode,
  airnodeClient,
  requesterAdminRole,
  clientUserRole,
  templateId,
  providerId,
  requesterIndex,
  requestTimeParameters
) {
  await airnode.connect(requesterAdminRole).updateClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
  const tx = await airnodeClient.connect(clientUserRole).makeShortRequest(templateId, requestTimeParameters);
  const log = await verifyLog(airnode, tx, 'ClientShortRequestCreated(bytes32,bytes32,uint256,address,bytes32,bytes)', {
    providerId,
    clientAddress: airnodeClient.address,
    templateId,
    parameters: ethers.utils.hexlify(requestTimeParameters),
  });
  const expectedRequestId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'bytes32', 'bytes32', 'bytes'],
      [log.args.noRequests, airnodeClient.address, providerId, templateId, requestTimeParameters]
    )
  );
  expect(expectedRequestId).to.equal(log.args.requestId);
  return expectedRequestId;
}

async function makeFullRequest(
  airnode,
  airnodeClient,
  requesterAdminRole,
  clientUserRole,
  providerId,
  endpointId,
  requesterIndex,
  designatedWallet,
  fulfillAddress,
  fulfillFunctionId,
  requestTimeParameters
) {
  await airnode.connect(requesterAdminRole).updateClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
  const tx = await airnodeClient
    .connect(clientUserRole)
    .makeFullRequest(
      providerId,
      endpointId,
      requesterIndex,
      designatedWallet,
      fulfillAddress,
      fulfillFunctionId,
      requestTimeParameters
    );
  const log = await verifyLog(
    airnode,
    tx,
    'ClientFullRequestCreated(bytes32,bytes32,uint256,address,bytes32,uint256,address,address,bytes4,bytes)',
    {
      providerId,
      clientAddress: fulfillAddress,
      endpointId,
      requesterIndex,
      designatedWallet,
      fulfillAddress,
      fulfillFunctionId,
      parameters: ethers.utils.hexlify(requestTimeParameters),
    }
  );
  const expectedRequestId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'bytes32', 'bytes32', 'bytes'],
      [log.args.noRequests, fulfillAddress, providerId, endpointId, requestTimeParameters]
    )
  );
  expect(expectedRequestId).to.equal(log.args.requestId);
  return expectedRequestId;
}

module.exports = {
  makeRequest: makeRequest,
  makeShortRequest: makeShortRequest,
  makeFullRequest: makeFullRequest,
};
