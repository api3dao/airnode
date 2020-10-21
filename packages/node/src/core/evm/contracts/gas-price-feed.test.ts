import { GasPriceFeed } from './gas-price-feed';

describe('GasPriceFeed', () => {
  it('exposes the addresses for each network', () => {
    const chainIds = Object.keys(GasPriceFeed.addresses).sort();
    expect(chainIds).toEqual(['1', '1337', '3']);

    // We don't care what the value of 1337 is set to
    expect.assertions(chainIds.length);

    expect(GasPriceFeed.addresses[1]).toEqual('<TODO>');
    expect(GasPriceFeed.addresses[3]).toEqual('0x3071f278C740B3E3F76301Cf7CAFcdAEB0682565');
  });

  it('exposes the contract ABI', () => {
    expect(GasPriceFeed.ABI).toEqual(['function latestAnswer() view returns (int256)']);
  });
});
