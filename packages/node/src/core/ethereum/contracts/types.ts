export type Network = 'ropsten' | 'mainnet';

export type ABI = string[];

export interface Contract {
  abi: ABI;
  addresses: { [nework in Network]: string };
}
