import { ChainID } from '../networks';

// TODO: Can't find the ethers.js type for ABIs
export type ABI = string[] | any;

export interface Contract {
  ABI: ABI;
  addresses: { [chainId in ChainID]: string };
  topics: { [key: string]: string };
}
