import { AggregatedApiCall, TestingGatewayAggregatedApiCall } from '../../src/types';

// TODO: Rename
export function buildAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    type: 'regular',
    sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    airnodeAddress: '0xa30ca71ba54e83127214d3271aea8f5d6bd4dace',
    requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorWalletAddress: '0x15c2D488bE806Ee769078Cceec00E57a9f2009E1',
    chainId: '31337',
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8', // apiCallId
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    ...params,
  };
}

export function buildAggregatedTestingGatewayApiCall(
  params?: Partial<TestingGatewayAggregatedApiCall>
): TestingGatewayAggregatedApiCall {
  return {
    type: 'testing-gateway',
    airnodeAddress: '0xa30ca71ba54e83127214d3271aea8f5d6bd4dace',
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8', // apiCallId
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    ...params,
  };
}
