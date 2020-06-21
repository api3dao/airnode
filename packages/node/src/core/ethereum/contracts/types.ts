/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 */
export type Network = 1 | 3;

export type ABI = string[];

export interface Contract {
  ABI: ABI;
  addresses: { [nework in Network]: string };
}
