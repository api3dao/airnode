import { Aggregator } from './aggregator';

describe('Aggregator', () => {
  it('exposes the addresses for each network', () => {
    expect(Aggregator.addresses).toEqual({
      1: '<TODO>',
      3: '<TODO>',
    });
  });

  it('exposes the contract ABI', () => {
    expect(Aggregator.ABI).toEqual([
      'event NewRequest(address indexed requester, uint256 requestInd)',
      'event RequestFulfilled(address indexed fulfiller, uint256 requestInd)',
    ]);
  });
});
