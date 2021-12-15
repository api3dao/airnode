import { TestingGatewayAggregatedApiCall, RegularAggregatedApiCall } from '../../src/types';

export function buildAggregatedRegularApiCall(params?: Partial<RegularAggregatedApiCall>): RegularAggregatedApiCall {
  return {
    type: 'regular',
    sponsorAddress: '0x61648B2Ec3e6b3492E90184Ef281C2ba28a675ec',
    airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
    requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorWalletAddress: '0x654B6d01E1A03eeF91F50D79203Ace648be81350',
    chainId: '31337',
    endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
    endpointName: 'convertToUSD',
    id: '0x1848c75378cb0f0c14c9255c6d7631aac3f1f236e502340b4a4dc0e184841153',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    templateId: null,
    requestType: 'full',
    encodedParameters:
      '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
    fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    fulfillFunctionId: '0x7c1de7e1',
    metadata: {
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 11,
      currentBlock: 12,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x02e30c77dadb360236b2b13c257ea938a904eb395b596807dfb890624476885b',
    },
    requestCount: '1',
    ...params,
  };
}

export function buildAggregatedTestingGatewayApiCall(
  params?: Partial<TestingGatewayAggregatedApiCall>
): TestingGatewayAggregatedApiCall {
  return {
    type: 'testing-gateway',
    airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    ...params,
  };
}
