import { ethers } from 'ethers';
// TODO: use once https://github.com/ethereum-ts/TypeChain/pull/368 is merged
// import { AirnodeRrpFactory } from '@airnode/protocol';
import { Contract } from './types';

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

// TODO: remove once https://github.com/ethereum-ts/TypeChain/pull/368 is merged
const ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'xpub',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'authorizers',
        type: 'address[]',
      },
    ],
    name: 'AirnodeParametersSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'clientAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'endorsementStatus',
        type: 'bool',
      },
    ],
    name: 'ClientEndorsementStatusSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'requestId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'noRequests',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'chainId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'clientAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'endpointId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'designatedWallet',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'fulfillAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes4',
        name: 'fulfillFunctionId',
        type: 'bytes4',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'parameters',
        type: 'bytes',
      },
    ],
    name: 'ClientFullRequestCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'requestId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'noRequests',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'chainId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'clientAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'templateId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'designatedWallet',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'fulfillAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes4',
        name: 'fulfillFunctionId',
        type: 'bytes4',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'parameters',
        type: 'bytes',
      },
    ],
    name: 'ClientRequestCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'requestId',
        type: 'bytes32',
      },
    ],
    name: 'ClientRequestFailed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'requestId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'statusCode',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'ClientRequestFulfilled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'RequesterCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'RequesterUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'templateId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'endpointId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'parameters',
        type: 'bytes',
      },
    ],
    name: 'TemplateCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'withdrawalRequestId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'designatedWallet',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'destination',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'WithdrawalFulfilled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'withdrawalRequestId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'designatedWallet',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'destination',
        type: 'address',
      },
    ],
    name: 'WithdrawalRequested',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'requestId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'endpointId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'designatedWallet',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'clientAddress',
        type: 'address',
      },
    ],
    name: 'checkAuthorizationStatus',
    outputs: [
      {
        internalType: 'bool',
        name: 'status',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32[]',
        name: 'requestIds',
        type: 'bytes32[]',
      },
      {
        internalType: 'bytes32[]',
        name: 'endpointIds',
        type: 'bytes32[]',
      },
      {
        internalType: 'uint256[]',
        name: 'requesterIndices',
        type: 'uint256[]',
      },
      {
        internalType: 'address[]',
        name: 'designatedWallets',
        type: 'address[]',
      },
      {
        internalType: 'address[]',
        name: 'clientAddresses',
        type: 'address[]',
      },
    ],
    name: 'checkAuthorizationStatuses',
    outputs: [
      {
        internalType: 'bool[]',
        name: 'statuses',
        type: 'bool[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'clientAddressToNoRequests',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'createRequester',
    outputs: [
      {
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'endpointId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'parameters',
        type: 'bytes',
      },
    ],
    name: 'createTemplate',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'templateId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'requestId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'fulfillAddress',
        type: 'address',
      },
      {
        internalType: 'bytes4',
        name: 'fulfillFunctionId',
        type: 'bytes4',
      },
    ],
    name: 'fail',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'requestId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'statusCode',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
      {
        internalType: 'address',
        name: 'fulfillAddress',
        type: 'address',
      },
      {
        internalType: 'bytes4',
        name: 'fulfillFunctionId',
        type: 'bytes4',
      },
    ],
    name: 'fulfill',
    outputs: [
      {
        internalType: 'bool',
        name: 'callSuccess',
        type: 'bool',
      },
      {
        internalType: 'bytes',
        name: 'callData',
        type: 'bytes',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'withdrawalRequestId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'destination',
        type: 'address',
      },
    ],
    name: 'fulfillWithdrawal',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
    ],
    name: 'getAirnodeParameters',
    outputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'xpub',
        type: 'string',
      },
      {
        internalType: 'address[]',
        name: 'authorizers',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
    ],
    name: 'getAirnodeParametersAndBlockNumber',
    outputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'xpub',
        type: 'string',
      },
      {
        internalType: 'address[]',
        name: 'authorizers',
        type: 'address[]',
      },
      {
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'templateId',
        type: 'bytes32',
      },
    ],
    name: 'getTemplate',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'endpointId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'parameters',
        type: 'bytes',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32[]',
        name: 'templateIds',
        type: 'bytes32[]',
      },
    ],
    name: 'getTemplates',
    outputs: [
      {
        internalType: 'bytes32[]',
        name: 'airnodeIds',
        type: 'bytes32[]',
      },
      {
        internalType: 'bytes32[]',
        name: 'endpointIds',
        type: 'bytes32[]',
      },
      {
        internalType: 'bytes[]',
        name: 'parameters',
        type: 'bytes[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'endpointId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'designatedWallet',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'fulfillAddress',
        type: 'address',
      },
      {
        internalType: 'bytes4',
        name: 'fulfillFunctionId',
        type: 'bytes4',
      },
      {
        internalType: 'bytes',
        name: 'parameters',
        type: 'bytes',
      },
    ],
    name: 'makeFullRequest',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'requestId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'templateId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'designatedWallet',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'fulfillAddress',
        type: 'address',
      },
      {
        internalType: 'bytes4',
        name: 'fulfillFunctionId',
        type: 'bytes4',
      },
      {
        internalType: 'bytes',
        name: 'parameters',
        type: 'bytes',
      },
    ],
    name: 'makeRequest',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'requestId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'requestWithIdHasFailed',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'designatedWallet',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'destination',
        type: 'address',
      },
    ],
    name: 'requestWithdrawal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'requesterIndexToAdmin',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'requesterIndexToClientAddressToEndorsementStatus',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'requesterIndexToNoWithdrawalRequests',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'xpub',
        type: 'string',
      },
      {
        internalType: 'address[]',
        name: 'authorizers',
        type: 'address[]',
      },
    ],
    name: 'setAirnodeParameters',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'xpub',
        type: 'string',
      },
      {
        internalType: 'address[]',
        name: 'authorizers',
        type: 'address[]',
      },
    ],
    name: 'setAirnodeParametersAndForwardFunds',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'airnodeId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'clientAddress',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'endorsementStatus',
        type: 'bool',
      },
    ],
    name: 'setClientEndorsementStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'requesterIndex',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'setRequesterAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export const AirnodeRrp: Contract = {
  ABI,
  topics: {
    // API calls
    ClientRequestCreated,
    ClientFullRequestCreated,

    ClientRequestFulfilled,
    ClientRequestFailed,

    // Withdrawals
    WithdrawalRequested,
    WithdrawalFulfilled,
  },
};
