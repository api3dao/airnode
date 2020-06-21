import * as utils from './utils';

describe('gweiToWei', () => {
  it('converts Gwei input to the BigNumber Wei equivalent', () => {
    const wei = utils.gweiToWei('45.4');
    expect(wei).toEqual({ _hex: '0x0a920d0600', _isBigNumber: true });
    expect(wei.toString()).toEqual('45400000000');
  });
});

describe('weiToGwei', () => {
  it('converts BigNumber Wei to Gwei', () => {
    const wei = utils.gweiToWei('45.4');
    const gwei = utils.weiToGwei(wei);
    expect(gwei).toEqual('45.4');
  });
});

describe('weiToBigNumber', () => {
  it('converts a Wei string to a BigNumber', () => {
    const wei = utils.weiToBigNumber('45400000000');
    expect(wei).toEqual({ _hex: '0x0a920d0600', _isBigNumber: true });
  });
});

describe('sortBigNumbers', () => {
  it('sorts Wei prices with the biggest amount first', () => {
    const big = utils.gweiToWei('56');
    const middle = utils.gweiToWei('52');
    const small = utils.gweiToWei('47');
    const smallest = utils.gweiToWei('42');

    expect(utils.sortBigNumbers([small, big, smallest, middle])).toEqual([big, middle, small, smallest]);
  });
});
