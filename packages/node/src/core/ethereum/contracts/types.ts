/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 */
export type ChainID = 1 | 3;

// TODO: what is the ethers type for the ABI?
export type ABI = string[] | any;

export interface Contract {
  ABI: ABI;
  addresses: { [chainId in ChainID]: string };
  topics: { [key: string]: string };
}
