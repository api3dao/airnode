import { ethers } from 'ethers';
import { AirnodeAbi } from '@airnode/protocol';
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

const ClientRequestFulfilled = ethers.utils.id('ClientRequestFulfilled(bytes32,bytes32,uint256,bytes32)');
const ClientRequestFulfilledWithBytes = ethers.utils.id(
  'ClientRequestFulfilledWithBytes(bytes32,bytes32,uint256,bytes)'
);
const ClientRequestFailed = ethers.utils.id('ClientRequestFailed(bytes32,bytes32)');

const WithdrawalRequested = ethers.utils.id('WithdrawalRequested(bytes32,bytes32,bytes32,address)');
const WithdrawalFulfilled = ethers.utils.id('WithdrawalFulfilled(bytes32,bytes32,bytes32,address,uint256)');

export const Airnode: Contract = {
  addresses: {
    1: '<TODO>',
    3: '0x9AF16dE521f41B0e0E70A4f26F9E0C73D757Bd81',
    4: '0xf8f2f4a8317947B6037186e5aC87D015bcD756C1',
    1337: '0x197F3826040dF832481f835652c290aC7c41f073',
  },
  ABI: AirnodeAbi,
  topics: {
    // API calls
    ClientRequestCreated,
    ClientShortRequestCreated,
    ClientFullRequestCreated,

    ClientRequestFulfilled,
    ClientRequestFulfilledWithBytes,
    ClientRequestFailed,

    // Withdrawals
    WithdrawalRequested,
    WithdrawalFulfilled,
  },
};
