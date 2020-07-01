import { Aggregator, getContractInterface } from './aggregator';

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

describe('getContractInterface', () => {
  it('returns the contract interface', () => {
    const contractInterface = getContractInterface();
    expect(Object.keys(contractInterface.events)).toEqual([
      'NewRequest(address,uint256)',
      'RequestFulfilled(address,uint256)',
    ]);
  });
});
