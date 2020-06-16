import { Contract } from './types';

export const GasPriceFeed: Contract = {
  addresses: {
    mainnet: '<TODO>',
    ropsten: '0x3071f278C740B3E3F76301Cf7CAFcdAEB0682565',
  },
  ABI: ['function latestAnswer() view returns (int256)'],
};
