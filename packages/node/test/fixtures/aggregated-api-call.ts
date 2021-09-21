import { AggregatedApiCall } from '../../src/types';

export function buildAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    airnodeAddress: '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
    requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorWalletAddress: '0xd5e6a768f1d23d30B386Bb5c125DBe83A9c40c73',
    chainId: '31337',
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: 'apiCallId',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    ...params,
  };
}
