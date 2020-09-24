import { ethers } from 'ethers';

/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 * 1337 - Local Ganache (develpment)
 */
export type ChainID = 1 | 3 | 1337;

type NetworkDetails = {
  [chainId: number]: ethers.providers.Network;
};

export const NETWORKS: NetworkDetails = {
  1: { chainId: 1, name: 'homestead' },
  3: { chainId: 3, name: 'ropsten' },
};
