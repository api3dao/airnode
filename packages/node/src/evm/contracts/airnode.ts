import { ethers } from 'ethers';
import { AirnodeArtifact } from '@airnode/protocol';
import { Contract } from './types';

const ClientRequestCreated = ethers.utils.id(
  'ClientRequestCreated(bytes32,bytes32,uint256,address,bytes32,uint256,address,address,bytes4,bytes)'
);
const ClientShortRequestCreated = ethers.utils.id(
  'ClientShortRequestCreated(bytes32,bytes32,uint256,address,bytes32,bytes)'
);
const ClientFullRequestCreated = ethers.utils.id(
  'ClientFullRequestCreated(bytes32,bytes32,uint256,address,bytes32,uint256,address,address,bytes4,bytes)'
);

const ClientRequestFulfilled = ethers.utils.id('ClientRequestFulfilled(bytes32,bytes32,uint256,bytes)');
const ClientRequestFailed = ethers.utils.id('ClientRequestFailed(bytes32,bytes32)');

const WithdrawalRequested = ethers.utils.id('WithdrawalRequested(bytes32,uint256,bytes32,address,address)');
const WithdrawalFulfilled = ethers.utils.id('WithdrawalFulfilled(bytes32,uint256,bytes32,address,address,uint256)');

export const Airnode: Contract = {
  ABI: AirnodeArtifact.abi,
  topics: {
    // API calls
    ClientRequestCreated,
    ClientShortRequestCreated,
    ClientFullRequestCreated,

    ClientRequestFulfilled,
    ClientRequestFailed,

    // Withdrawals
    WithdrawalRequested,
    WithdrawalFulfilled,
  },
};
