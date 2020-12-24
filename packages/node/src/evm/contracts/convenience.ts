import { Contract } from './types';
import { ConvenienceArtifact, ConvenienceAddresses } from '@airnode/protocol';

export const Convenience: Contract = {
  addresses: {
    1: '<TODO>',
    3: ConvenienceAddresses[3],
    4: ConvenienceAddresses[4],
    1337: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
  },
  ABI: ConvenienceArtifact.abi,
  topics: {},
};
