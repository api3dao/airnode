import { TestingGatewayAggregatedApiCall, RegularAggregatedApiCall } from '../../src/types';

export function buildAggregatedRegularApiCall(params?: Partial<RegularAggregatedApiCall>): RegularAggregatedApiCall {
  return {
    type: 'regular',
    sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
    airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
    requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
    chainId: '31337',
    endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
    endpointName: 'convertToUSD',
    id: '0xbc5fa2d0ab4d9bbb74dbf91d3577a73589d82a70f356bf31237b1f2ddabc75a3',
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
      transactionHash: '0x07ac0f0e0915f11216c86b1dfad7ef05c1daa80ee607d18648d8b447e75caebd',
    },
    requestCount: '1',
    template: undefined,
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
