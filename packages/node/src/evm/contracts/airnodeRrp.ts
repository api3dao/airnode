import { ethers } from 'ethers';
// TODO: refactor once https://github.com/ethereum-ts/TypeChain/pull/368 is merged and published
import { AirnodeRrp, AirnodeRrpFactory, AirnodeRrpArtifact } from '@api3/protocol';

const MadeTemplateRequest = ethers.utils.id(
  'MadeTemplateRequest(address,bytes32,uint256,uint256,address,bytes32,address,address,address,bytes4,bytes)'
);
const MadeFullRequest = ethers.utils.id(
  'MadeFullRequest(address,bytes32,uint256,uint256,address,bytes32,address,address,address,bytes4,bytes)'
);

const FulfilledRequest = ethers.utils.id('FulfilledRequest(address,bytes32,uint256,bytes)');
const FailedRequest = ethers.utils.id('FailedRequest(address,bytes32)');

const RequestedWithdrawal = ethers.utils.id('RequestedWithdrawal(address,address,bytes32,address)');
const FulfilledWithdrawal = ethers.utils.id('FulfilledWithdrawal(address,address,bytes32,address,uint256)');

const airnodeRrpTopics = {
  // API calls
  MadeTemplateRequest,
  MadeFullRequest,

  FulfilledRequest,
  FailedRequest,

  // Withdrawals
  RequestedWithdrawal,
  FulfilledWithdrawal,
};

export { AirnodeRrpFactory, AirnodeRrp, AirnodeRrpArtifact, airnodeRrpTopics };
