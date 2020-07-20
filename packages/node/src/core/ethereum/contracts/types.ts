/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 */
export type ChainID = 1 | 3;

// TODO: Can't find the ethers.js type for ABIs
export type ABI = string[] | any;

export interface Contract {
  ABI: ABI;
  addresses: { [chainId in ChainID]: string };
  topics: { [key: string]: string };
}
