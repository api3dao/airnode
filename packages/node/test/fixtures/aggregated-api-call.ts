import { AggregatedApiCall } from '../../src/types';

export function buildAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    requesterIndex: '5',
    airnodeAddress: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
    clientAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorWallet: '0xD748Bc4212d8130879Ec4F24B950cAAb9EddfCB2',
    chainId: '31337',
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: 'apiCallId',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    ...params,
  };
}
