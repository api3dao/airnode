import * as networks from './networks';

describe('NETWORKS', () => {
  it('exposes a list of "known" networks', () => {
    expect(networks.NETWORKS).toEqual({
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
    });
  });
});
