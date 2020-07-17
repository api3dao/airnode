import { ethers } from 'ethers';
import { Contract } from './types';

export const Aggregator: Contract = {
  addresses: {
    1: '<TODO>',
    3: '<TODO>',
  },
  ABI: [
    'event NewRequest(address indexed requester, uint256 requestInd)',
    'event RequestFulfilled(address indexed fulfiller, uint256 requestInd)',
  ],
};

export function getContractInterface() {
  return new ethers.utils.Interface(Aggregator.ABI);
}
