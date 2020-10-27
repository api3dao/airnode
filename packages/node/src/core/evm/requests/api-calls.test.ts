import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import * as apiCalls from './api-calls';
import { RequestErrorCode, RequestStatus } from 'src/types';

describe('initialize ApiCall ClientRequest', () => {
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
          noRequests: ethers.BigNumber.from('12'),
        },
        topic: '0xfcbcd5adb2d26ecd4ad50e6267e977fd479fcd0a6c82bde8eea85290ab3b46e6',
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    expect(apiCalls.initialize(logWithMetadata)).toEqual({
      clientAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      designatedWallet: null,
      endpointId: null,
      fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      fulfillFunctionId: '0x042f2b65',
      encodedParameters: '0x636b6579a169736f6d657468696e676576616c7565',
      id: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
      metadata: {
        blockNumber: 10716082,
        transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
      },
      parameters: {},
      providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
      requestCount: '12',
      requesterIndex: null,
      status: RequestStatus.Pending,
      templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
      type: 'short',
      // TODO: protocol-overhaul remove these
      errorAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
      errorFunctionId: '0xba12a5e4',
      requesterId: 'requesterId',
      walletIndex: '1',
      walletAddress: 'walletAddress',
      walletBalance: '100000',
      walletMinimumBalance: '50000',
    });
  });

  it('sets the API call type', () => {
    const base: any = {
      parsedLog: {
        args: {
          providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
          requestId: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
          requester: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
          fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          fulfillFunctionId: '0x042f2b65',
          parameters: '0x636b6579a169736f6d657468696e676576616c7565',
          noRequests: ethers.BigNumber.from('12'),
        },
        topic: '0xfcbcd5adb2d26ecd4ad50e6267e977fd479fcd0a6c82bde8eea85290ab3b46e6',
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const short = {
      ...base,
      parsedLog: { ...base.parsedLog, topic: '0xfcbcd5adb2d26ecd4ad50e6267e977fd479fcd0a6c82bde8eea85290ab3b46e6' },
    };
    const regular = {
      ...base,
      parsedLog: { ...short.parsedLog, topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b' },
    };
    const full = {
      ...base,
      parsedLog: { ...short.parsedLog, topic: '0x775e78a8e7375d14ad03d31edd0a27b29a055f732bca987abfe8082c16ed7e44' },
    };

    expect(apiCalls.initialize(short).type).toEqual('short');
    expect(apiCalls.initialize(regular).type).toEqual('regular');
    expect(apiCalls.initialize(full).type).toEqual('full');
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
          noRequests: ethers.BigNumber.from('12'),
        },
        topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b',
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    const initialRequest = apiCalls.initialize(logWithMetadata);
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
          noRequests: ethers.BigNumber.from('12'),
        },
        topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b',
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    const initialRequest = apiCalls.initialize(logWithMetadata);
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
          noRequests: ethers.BigNumber.from('12'),
        },
        topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b',
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    const initialRequest = apiCalls.initialize(logWithMetadata);
    expect(initialRequest.parameters).toEqual({});

    const [logs, withParameters] = apiCalls.applyParameters(initialRequest);
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
    const apiCall = fixtures.requests.createApiCall();
    const [logs, requests] = apiCalls.updateFulfilledRequests([apiCall], []);
    expect(logs).toEqual([]);
    expect(requests).toEqual([apiCall]);
  });
});

describe('mapRequests (ApiCall)', () => {
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
        noRequests: ethers.BigNumber.from('12'),
      },
      topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b',
    },
    blockNumber: 10716082,
    transactionHash: '0xb1c9cce6d0f054958cf8542c5cdc6b558c6d628f8e2bac37fca0126c5793f11c',
  };

  it('returns API call requests', () => {
    const [logs, res] = apiCalls.mapRequests([requestLog]);
    expect(logs).toEqual([]);
    expect(res).toEqual([
      {
        clientAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        designatedWallet: null,
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
        requestCount: '12',
        requesterIndex: null,
        status: RequestStatus.Pending,
        templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
        type: 'regular',
        // TODO: protocol-overhaul remove these
        requesterId: 'requesterId',
        walletIndex: '1',
        walletAddress: 'walletAddress',
        walletBalance: '100000',
        walletMinimumBalance: '50000',
      },
    ]);
  });

  // TODO: get some example events to use here
  pending('updates the status of fulfilled ApiCall requests');
});
