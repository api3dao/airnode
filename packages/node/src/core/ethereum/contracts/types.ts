export type Network = 'ropsten' | 'mainnet';

export type ABI = string[];

export interface Contract {
  ABI: ABI;
  addresses: { [nework in Network]: string };
}
