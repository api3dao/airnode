import { ethers } from 'ethers';
import compiledContract from './json/airnode.json';
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
    3: '0x32D228B5d44Fd18FefBfd68BfE5A5F3f75C873AE',
    4: '0x30fDdaB1C62fB4C8471E8c3B7a3123a04BE5fFC1',
    1337: '0x197F3826040dF832481f835652c290aC7c41f073',
  },
  ABI: compiledContract.abi,
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
