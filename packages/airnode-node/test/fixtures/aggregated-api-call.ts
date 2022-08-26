import {
  RegularAggregatedApiCall,
  HttpSignedDataAggregatedApiCall,
  BaseAggregatedApiCall,
  RegularAggregatedApiCallWithResponse,
} from '../../src/types';

export function buildAggregatedRegularApiCall(params?: Partial<RegularAggregatedApiCall>): RegularAggregatedApiCall {
  return {
    sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
    airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
    requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
    chainId: '31337',
    endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
    endpointName: 'convertToUSD',
    id: '0xf40127616f09d41b20891bcfd326957a0e3d5a5ecf659cff4d8106c04b024374',
    oisTitle: 'Currency Converter API',
    cacheResponses: false,
    parameters: { from: 'ETH' },
    templateId: null,
    requestType: 'full',
    encodedParameters:
      '0x317373737373000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
    fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    fulfillFunctionId: '0x7c1de7e1',
    metadata: {
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 11,
      currentBlock: 12,
      minConfirmations: 0,
      transactionHash: '0x40b93a1e81c7162460af066be96266ff692515a2f6b54bd622aa9f82ee00670f',
      logIndex: 0,
    },
    requestCount: '1',
    template: undefined,
    ...params,
  };
}

export function buildAggregatedRegularApiCallWithResponse(
  params?: Partial<RegularAggregatedApiCallWithResponse>
): RegularAggregatedApiCallWithResponse {
  return {
    ...buildAggregatedRegularApiCall(params),
    success: true,
    data: {
      encodedValue: '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
      signature:
        '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
    },
    ...(params as any),
  };
}

export function buildAggregatedHttpGatewayApiCall(params?: Partial<BaseAggregatedApiCall>): BaseAggregatedApiCall {
  return {
    endpointName: 'convertToUSD',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    ...params,
  };
}

export function buildAggregatedHttpSignedDataApiCall(
  params?: Partial<HttpSignedDataAggregatedApiCall>
): HttpSignedDataAggregatedApiCall {
  return {
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    templateId: '0x600975681b98422eee1146d4b835a8103689ae4cddb76069925a929caf0eb79f',
    template: {
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      endpointId: 'endpointId',
      id: '0x600975681b98422eee1146d4b835a8103689ae4cddb76069925a929caf0eb79f',
      encodedParameters:
        '0x317373730000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000045544800000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f706174680000000000000000000000000000000000000000000000000000007072696365000000000000000000000000000000000000000000000000000000',
    },
    ...params,
  };
}
