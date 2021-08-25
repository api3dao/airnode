import { AggregatedApiCall } from '../../src/types';

export function buildAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    sponsorAddress: '5', //TODO: fix value
    airnodeAddress: '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
    requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorWallet: '0x8F3aF5ED5fC7bC86039Ad15B7fD7D99b2EAE5567',
    chainId: '31337',
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: 'apiCallId',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    ...params,
  };
}
