import { ethers } from 'ethers';

/*
 * Networks:
 *
 * 1 - Ethereum Mainnet
 * 3 - Ethereum Ropsten
 */
export type ChainID = 1 | 3;

type NetworkDetails = {
  [chainId in ChainID]: ethers.providers.Network;
}

export const NETWORKS: NetworkDetails = {
  1: { chainId: 1, name: 'homestead' },
  3: { chainId: 3, name: 'ropsten' },
};
