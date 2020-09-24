import { Aggregator } from './aggregator';

describe('Aggregator', () => {
  it('exposes the addresses for each network', () => {
    const chainIds = Object.keys(Aggregator.addresses).sort();
    expect(chainIds).toEqual(['1', '1337', '3']);

    // We don't care what the value of 1337 is set to
    expect.assertions(chainIds.length);

    expect(Aggregator.addresses[1]).toEqual('<TODO>');
    expect(Aggregator.addresses[3]).toEqual('<TODO>');
  });

  it('exposes the contract ABI', () => {
    expect(Aggregator.ABI).toEqual([
      'event NewRequest(address indexed requester, uint256 requestInd)',
      'event RequestFulfilled(address indexed fulfiller, uint256 requestInd)',
    ]);
  });
});
