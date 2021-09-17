import { AggregatedApiCall } from '../../src/types';

export function buildAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    sponsorAddress: '0x64b7d7c64A534086EfF591B73fcFa912feE74c69',
    airnodeAddress: '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
    requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorWallet: '0x3598aF73AAaCCf46A36e00490627029487D9730c',
    chainId: '31337',
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: 'apiCallId',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    ...params,
  };
}
