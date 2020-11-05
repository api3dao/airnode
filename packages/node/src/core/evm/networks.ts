import { ethers } from 'ethers';

/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 * 4 - Ethereum Rinkeby
 * 1337 - Local Ganache (develpment)
 */
export type ChainID = 1 | 3 | 4 | 1337;

type NetworkDetails = {
  [chainId: number]: ethers.providers.Network;
};

export const NETWORKS: NetworkDetails = {
  1: { chainId: 1, name: 'homestead' },
  3: { chainId: 3, name: 'ropsten' },
  4: { chainId: 4, name: 'rinkeby' },
};
