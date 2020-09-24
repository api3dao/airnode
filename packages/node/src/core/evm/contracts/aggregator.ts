import { Contract } from './types';

export const Aggregator: Contract = {
  addresses: {
    1: '<TODO>',
    3: '<TODO>',
    1337: '<TODO>',
  },
  ABI: [
    'event NewRequest(address indexed requester, uint256 requestInd)',
    'event RequestFulfilled(address indexed fulfiller, uint256 requestInd)',
  ],
  topics: {},
};
