/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 * 1337 - Local ganache
 */
export type ChainID = 1 | 3 | 1337;

// TODO: Can't find the ethers.js type for ABIs
export type ABI = string[] | any;

export interface Contract {
  ABI: ABI;
  addresses: { [chainId in ChainID]: string };
  topics: { [key: string]: string };
}
