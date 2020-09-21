import { RequestStatus } from 'src/types';
import * as apiCalls from './api-calls';

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

    expect(apiCalls.initialize(logWithMetadata, { providerIndex: 1 })).toEqual({
      endpointId: null,
      errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      errorFunctionId: '0xba12a5e4',
      fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      fulfillFunctionId: '0x042f2b65',
      encodedParameters: '0x636b6579a169736f6d657468696e676576616c7565',
      id: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
      metadata: {
        blockNumber: 10716082,
        metadata: 1,
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

    const initialRequest = apiCalls.initialize(logWithMetadata, { providerIndex: 0 });
    expect(initialRequest.parameters).toEqual({});

    const [logs, withParameters] = apiCalls.applyParameters(initialRequest);
    expect(logs).toEqual([]);
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

    const initialRequest = apiCalls.initialize(logWithMetadata, { providerIndex: 0 });
    expect(initialRequest.parameters).toEqual({});

    const [logs, withParameters] = apiCalls.applyParameters(initialRequest);
    expect(logs).toEqual([]);
    expect(withParameters).toEqual({ ...initialRequest, parameters: { key: { something: 'value' } } });
  });

  it('sets the request to errored if the parameters cannot be decoded', () => {
    const requestId = '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49';
    const parameters = '0xincorrectparameters';
    const logWithMetadata: any = {
      parsedLog: {
        args: {
          requestId,
          parameters,
          providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
          requester: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
          fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          fulfillFunctionId: '0x042f2b65',
          errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          errorFunctionId: '0xba12a5e4',
        },
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    const initialRequest = model.initialize(logWithMetadata);
    expect(initialRequest.parameters).toEqual({});

    const [logs, withParameters] = model.applyParameters(initialRequest);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Request ID:${requestId} submitted with invalid parameters: ${parameters}`,
      },
    ]);
    expect(withParameters).toEqual({
      ...initialRequest,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.InvalidRequestParameters,
    });
  });
});

describe('updateFulfilledRequests (ApiCall)', () => {
  // TODO: get some example events to use here
  pending('updates requests to be fulfilled if they have a matching log');

  it('returns the request if it is not fulfilled', () => {
    const apiCall = fixtures.requests.createBaseApiCall();
    const [logs, requests] = model.updateFulfilledRequests([apiCall], []);
    expect(logs).toEqual([]);
    expect(requests).toEqual([apiCall]);
  });
});

describe('mapBaseRequests (ApiCall)', () => {
  const requestLog: any = {
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
      topic: '0x74676e35c7aea7d314a29a1d492d5d8893a25cc42d1651aa8b28176f6ed1da00',
    },
    blockNumber: 10716082,
    transactionHash: '0xb1c9cce6d0f054958cf8542c5cdc6b558c6d628f8e2bac37fca0126c5793f11c',
  };

  it('returns API call base requests', () => {
    const [logs, err, res] = apiCalls.mapBaseRequests([requestLog]);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(res).toEqual([
      {
        endpointId: null,
        errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        errorFunctionId: '0xba12a5e4',
        fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        fulfillFunctionId: '0x042f2b65',
        encodedParameters: '0x636b6579a169736f6d657468696e676576616c7565',
        metadata: {
          blockNumber: 10716082,
          transactionHash: '0xb1c9cce6d0f054958cf8542c5cdc6b558c6d628f8e2bac37fca0126c5793f11c',
        },
        parameters: {
          key: { something: 'value' },
        },
        providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
        id: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
        requesterAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
        status: RequestStatus.Pending,
      },
    ]);
  });

  // TODO: get some example events to use here
  pending('updates the status of fulfilled ApiCall requests');
});
