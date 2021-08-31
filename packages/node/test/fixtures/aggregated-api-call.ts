import { AggregatedApiCall } from '../../src/types';

export function buildAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    sponsorAddress: '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6',
    airnodeAddress: '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
    requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorWallet: '0x4F716a9a20D03be77753F3D3e856a5e180995Eda',
    chainId: '31337',
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: 'apiCallId',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    ...params,
  };
}
