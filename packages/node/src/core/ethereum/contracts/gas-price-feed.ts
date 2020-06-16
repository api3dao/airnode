import { Contract } from './types';

export const GasPriceFeed: Contract = {
  addresses: {
    mainnet: '<TODO>',
    ropsten: '0xf65f76682cE8ef25372dEF29cAcDED5f54480e77',
  },
  ABI: ['function latestAnswer() view returns (int256)'],
};
