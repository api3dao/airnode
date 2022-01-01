import { ethers } from 'ethers';
// https://docs.api3.org/airnode/latest/reference/airnode-addresses.html

/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 * 4 - Ethereum Rinkeby
 * 5 - Ethereum Goerli
 * 42 - Ethereum Kovan
 * 31337 - Local Hardhat (development)
 *
 */
export type ChainID = 1 | 3 | 4 | 5 | 42 | 31337;

type NetworkDetails = {
  readonly [chainId: string]: ethers.providers.Network;
};

export const NETWORKS: NetworkDetails = {
  1: { chainId: 1, name: 'homestead' },
  3: { chainId: 3, name: 'ropsten' },
  4: { chainId: 4, name: 'rinkeby' },
  5: { chainId: 5, name: 'goerli' },
  42: { chainId: 42, name: 'kovan' },
};
