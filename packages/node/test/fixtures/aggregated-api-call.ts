import { AggregatedApiCall } from '../../src/types';

export function createAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    requesterIndex: '5',
    providerId: 'providerId',
    clientAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    designatedWallet: '0xD748Bc4212d8130879Ec4F24B950cAAb9EddfCB2',
    chainId: '1337',
    endpointId: 'endpointId',
    endpointName: 'convertToUsd',
    id: 'apiCallId',
    oisTitle: 'oisTitle',
    parameters: { from: 'ETH' },
    type: 'request',
    ...params,
  };
}
