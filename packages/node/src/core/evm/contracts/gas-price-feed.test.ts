import { GasPriceFeed } from './gas-price-feed';

describe('GasPriceFeed', () => {
  it('exposes the addresses for each network', () => {
    expect(GasPriceFeed.addresses).toEqual({
      1: '<TODO>',
      3: '0x3071f278C740B3E3F76301Cf7CAFcdAEB0682565',
      4: '<TODO>',
      1337: '<TODO>',
    });
  });

  it('exposes the contract ABI', () => {
    expect(GasPriceFeed.ABI).toEqual(['function latestAnswer() view returns (int256)']);
  });

  it('exposes the contract topics', () => {
    expect(GasPriceFeed.topics).toEqual({});
  });
});
