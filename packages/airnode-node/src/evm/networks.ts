import { ethers } from 'ethers';
// https://docs.api3.org/airnode/latest/reference/airnode-addresses.html

/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 * 4 - Ethereum Rinkeby
 * 5 - Ethereum Goerli
 * 10 - Optimism
 * 30 - RSK
 * 31 - RSK Testnet
 * 42 - Ethereum Kovan
 * 56 - Binance Smart Chain
 * 69 - Optimism Kovan Testnet
 * 77 - Gnosis Chain Testnet
 * 97 - Binance Smart Chain Testnet
 * 100 - Gnosis Chain
 * 137 - Polygon
 * 250 - Fantom Opera
 * 588 - Metis Testnet
 * 1088 - Metis Andromeda
 * 1284 - Moonbeam
 * 1285 - Moonriver
 * 1287 - Moonbase Alpha Testnet
 * 2001 - Milkomeda Cardano
 * 4002 - Fantom Testnet
 * 42161 - Arbitrum
 * 43113 - Avalanche FUJI C-Chain Testnet
 * 43114 - Avalanche
 * 31337 - Local Hardhat (development)
 * 80001 - Polygon Mumbai
 * 200101 - Milkomeda Testnet
 * 421611 - Arbitrum Testnet
 *
 */
export type ChainID =
  | 1
  | 3
  | 4
  | 5
  | 10
  | 30
  | 31
  | 42
  | 56
  | 69
  | 77
  | 97
  | 100
  | 137
  | 250
  | 588
  | 1088
  | 1284
  | 1285
  | 1287
  | 2001
  | 4002
  | 31337
  | 42161
  | 43113
  | 43114
  | 80001
  | 200101
  | 421611;

type NetworkDetails = {
  readonly [chainId: string]: ethers.providers.Network;
};

export const NETWORKS: NetworkDetails = {
  1: { chainId: 1, name: 'homestead' },
  3: { chainId: 3, name: 'ropsten' },
  4: { chainId: 4, name: 'rinkeby' },
  5: { chainId: 5, name: 'goerli' },
  10: { chainId: 10, name: 'optimism' },
  30: { chainId: 30, name: 'rsk' },
  31: { chainId: 31, name: 'rsk-testnet' },
  42: { chainId: 42, name: 'kovan' },
  56: { chainId: 56, name: 'bsc' },
  69: { chainId: 69, name: 'optimism-testnet' },
  77: { chainId: 77, name: 'gnosis-testnet' },
  97: { chainId: 97, name: 'bsc-testnet' },
  100: { chainId: 100, name: 'gnosis' },
  137: { chainId: 137, name: 'polygon' },
  250: { chainId: 250, name: 'fantom' },
  588: { chainId: 588, name: 'metis-testnet' },
  1088: { chainId: 1088, name: 'metis' },
  1284: { chainId: 1284, name: 'moonbeam' },
  1285: { chainId: 1285, name: 'moonriver' },
  1287: { chainId: 1287, name: 'moonbeam-testnet' },
  2001: { chainId: 2001, name: 'milkomeda' },
  4002: { chainId: 4002, name: 'fantom-testnet' },
  42161: { chainId: 42161, name: 'arbitrum' },
  43113: { chainId: 43113, name: 'avalanche-testnet' },
  43114: { chainId: 43114, name: 'avalanche' },
  80001: { chainId: 80001, name: 'polygon-mumbai' },
  200101: { chainId: 200101, name: 'milkomeda-testnet' },
  421611: { chainId: 421611, name: 'arbitrum-testnet' },
};
