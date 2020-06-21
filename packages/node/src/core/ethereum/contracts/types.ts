/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 */
export type ChainID = 1 | 3;

export type ABI = string[];

export interface Contract {
  ABI: ABI;
  addresses: { [chainId in ChainID]: string };
}
