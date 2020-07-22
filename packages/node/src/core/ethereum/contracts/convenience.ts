import { Contract } from './types';
import compiledContract from './json/chainapi.json';

export const Convenience: Contract = {
  addresses: {
    1: '<TODO>',
    3: '<TODO>',
  },
  ABI: compiledContract.abi,
  topics: {},
};
