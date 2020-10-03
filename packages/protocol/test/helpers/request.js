const { expect } = require('chai');
const { verifyLog } = require('../util');

async function makeRequest(
  airnode,
  requestTimeAirnodeClient,
  requesterAdminRole,
  clientUserRole,
  templateId,
  providerId,
  requestTimeRequesterInd,
  requestTimeDesignatedWalletAddress,
  requestTimeFulfillAddress,
  requestTimeFulfillFunctionId,
  requestTimeParameters
) {
  await airnode
    .connect(requesterAdminRole)
    .updateClientEndorsementStatus(requestTimeRequesterInd, requestTimeAirnodeClient.address, true);
  const tx = await requestTimeAirnodeClient
    .connect(clientUserRole)
    .makeRequest(
      templateId,
      requestTimeRequesterInd,
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
      requester: requestTimeFulfillAddress,
      templateId,
      requesterInd: requestTimeRequesterInd,
      designatedWallet: requestTimeDesignatedWalletAddress,
      fulfillAddress: requestTimeFulfillAddress,
      fulfillFunctionId: requestTimeFulfillFunctionId,
      parameters: ethers.utils.hexlify(requestTimeParameters),
    }
  );
  const expectedRequestId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'bytes32', 'bytes'],
      [log.args.noRequests, templateId, requestTimeParameters]
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
  requesterInd,
  requestTimeParameters
) {
  await airnode.connect(requesterAdminRole).updateClientEndorsementStatus(requesterInd, airnodeClient.address, true);
  const tx = await airnodeClient.connect(clientUserRole).makeShortRequest(templateId, requestTimeParameters);
  const log = await verifyLog(airnode, tx, 'ClientShortRequestCreated(bytes32,bytes32,uint256,address,bytes32,bytes)', {
    providerId,
    requester: airnodeClient.address,
    templateId,
    parameters: ethers.utils.hexlify(requestTimeParameters),
  });
  const expectedRequestId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'bytes32', 'bytes'],
      [log.args.noRequests, templateId, requestTimeParameters]
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
  requesterInd,
  designatedWallet,
  fulfillAddress,
  fulfillFunctionId,
  requestTimeParameters
) {
  await airnode.connect(requesterAdminRole).updateClientEndorsementStatus(requesterInd, airnodeClient.address, true);
  const tx = await airnodeClient
    .connect(clientUserRole)
    .makeFullRequest(
      providerId,
      endpointId,
      requesterInd,
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
      requester: fulfillAddress,
      endpointId,
      requesterInd,
      designatedWallet,
      fulfillAddress,
      fulfillFunctionId,
      parameters: ethers.utils.hexlify(requestTimeParameters),
    }
  );
  const expectedRequestId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'bytes32', 'bytes32', 'bytes'],
      [log.args.noRequests, providerId, endpointId, requestTimeParameters]
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
