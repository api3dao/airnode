import { ethers } from 'ethers';
// TODO: refactor once https://github.com/ethereum-ts/TypeChain/pull/368 is merged and published
import { AirnodeRrp, AirnodeRrpFactory, AirnodeRrpArtifact } from '@api3/protocol';

const ClientRequestCreated = ethers.utils.id(
  'ClientRequestCreated(bytes32,bytes32,uint256,uint256,address,bytes32,uint256,address,address,bytes4,bytes)'
);
const ClientFullRequestCreated = ethers.utils.id(
  'ClientFullRequestCreated(bytes32,bytes32,uint256,uint256,address,bytes32,uint256,address,address,bytes4,bytes)'
);

const ClientRequestFulfilled = ethers.utils.id('ClientRequestFulfilled(bytes32,bytes32,uint256,bytes)');
const ClientRequestFailed = ethers.utils.id('ClientRequestFailed(bytes32,bytes32)');

const WithdrawalRequested = ethers.utils.id('WithdrawalRequested(bytes32,uint256,bytes32,address,address)');
const WithdrawalFulfilled = ethers.utils.id('WithdrawalFulfilled(bytes32,uint256,bytes32,address,address,uint256)');

const airnodeRrpTopics = {
  // API calls
  ClientRequestCreated,
  ClientFullRequestCreated,

  ClientRequestFulfilled,
  ClientRequestFailed,

  // Withdrawals
  WithdrawalRequested,
  WithdrawalFulfilled,
};

export { AirnodeRrpFactory, AirnodeRrp, AirnodeRrpArtifact, airnodeRrpTopics };
