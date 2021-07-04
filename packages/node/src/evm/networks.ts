import { ethers } from 'ethers';

/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 * 4 - Ethereum Rinkeby
 * 31337 - Local Hardhat (development)
 */
export type ChainID = 1 | 3 | 4 | 31337;

type NetworkDetails = {
  readonly [chainId: string]: ethers.providers.Network;
};

export const NETWORKS: NetworkDetails = {
  1: { chainId: 1, name: 'homestead' },
  3: { chainId: 3, name: 'ropsten' },
  4: { chainId: 4, name: 'rinkeby' },
};
