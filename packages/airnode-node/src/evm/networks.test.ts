import * as networks from './networks';

describe('NETWORKS', () => {
  it('exposes a list of "known" networks', () => {
    expect(networks.NETWORKS).toEqual({
      1: { chainId: 1, name: 'homestead' },
      3: { chainId: 3, name: 'ropsten' },
      4: { chainId: 4, name: 'rinkeby' },
      5: { chainId: 5, name: 'goerli' },
      42: { chainId: 42, name: 'kovan' },
    });
  });
});
