import * as fixtures from 'test/fixtures';
import * as model from './model';
import * as providerState from '../../providers/state';
import { AggregatedApiCall, ProviderState, RequestErrorCode, RequestStatus } from '../../../types';

describe('initialize ApiCall BaseRequest', () => {
  it('initializes a new ApiCall request', () => {
    const logWithMetadata: any = {
      parsedLog: {
        args: {
          providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
          requestId: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
          requester: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
          fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          fulfillFunctionId: '0x042f2b65',
          errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          errorFunctionId: '0xba12a5e4',
          parameters: '0x636b6579a169736f6d657468696e676576616c7565',
        },
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    expect(model.initialize(logWithMetadata)).toEqual({
      endpointId: null,
      errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      errorFunctionId: '0xba12a5e4',
      fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      fulfillFunctionId: '0x042f2b65',
      encodedParameters: '0x636b6579a169736f6d657468696e676576616c7565',
      id: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
      logMetadata: {
        blockNumber: 10716082,
        transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
      },
      parameters: {},
      providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
      requesterAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      status: RequestStatus.Pending,
      templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
    });
  });
});

describe('applyParameters', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('does nothing if encodedParameters is falsey', () => {
    const logWithMetadata: any = {
      parsedLog: {
        args: {
          providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
          requestId: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
          requester: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
          fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          fulfillFunctionId: '0x042f2b65',
          errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          errorFunctionId: '0xba12a5e4',
          parameters: '',
        },
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    const initialRequest = model.initialize(logWithMetadata);
    expect(initialRequest.parameters).toEqual({});

    const withParameters = model.applyParameters(state, initialRequest);
    expect(withParameters).toEqual(initialRequest);
  });

  it('decodes and adds the parameters to the request', () => {
    const logWithMetadata: any = {
      parsedLog: {
        args: {
          providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
          requestId: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
          requester: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
          fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          fulfillFunctionId: '0x042f2b65',
          errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          errorFunctionId: '0xba12a5e4',
          parameters: '0x636b6579a169736f6d657468696e676576616c7565',
        },
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    const initialRequest = model.initialize(logWithMetadata);
    expect(initialRequest.parameters).toEqual({});

    const withParameters = model.applyParameters(state, initialRequest);
    expect(withParameters).toEqual({ ...initialRequest, parameters: { key: { something: 'value' } } });
  });

  it('sets the request to errored if the parameters cannot be decoded', () => {
    const logWithMetadata: any = {
      parsedLog: {
        args: {
          providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
          requestId: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
          requester: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
          fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          fulfillFunctionId: '0x042f2b65',
          errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          errorFunctionId: '0xba12a5e4',
          parameters: '0xincorrectparameters',
        },
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    const initialRequest = model.initialize(logWithMetadata);
    expect(initialRequest.parameters).toEqual({});

    const withParameters = model.applyParameters(state, initialRequest);
    expect(withParameters).toEqual({
      ...initialRequest,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.InvalidRequestParameters,
    });
  });
});

describe('isDuplicate', () => {
  it('compares the relevant API call attributes to the aggregated API call', () => {
    const apiCall = fixtures.requests.createApiCall({
      id: '0x123',
      endpointId: '0x987',
      parameters: { from: 'ETH', to: 'USDC' },
    });

    const baseAggregatedCall: AggregatedApiCall = {
      id: '0x123',
      endpointId: '0x987',
      parameters: { from: 'ETH', to: 'USDC' },
      providers: [0, 1, 2],
      type: 'request',
    };
    const aggregatedCall: AggregatedApiCall = { ...baseAggregatedCall };
    const differentId: AggregatedApiCall = { ...baseAggregatedCall, id: '0xabc' };
    const differentEndpoint: AggregatedApiCall = { ...baseAggregatedCall, endpointId: '0xdef' };
    const differentParameters: AggregatedApiCall = { ...baseAggregatedCall, parameters: { from: 'ETH', to: 'BTC' } };

    expect(model.isDuplicate(apiCall, aggregatedCall)).toEqual(true);
    expect(model.isDuplicate(apiCall, differentId)).toEqual(false);
    expect(model.isDuplicate(apiCall, differentEndpoint)).toEqual(false);
    expect(model.isDuplicate(apiCall, differentParameters)).toEqual(false);
  });
});
