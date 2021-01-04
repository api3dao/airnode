import { ethers } from 'ethers';
import * as contracts from '../contracts';
import * as fixtures from 'test/fixtures';
import * as apiCalls from './api-calls';
import { RequestErrorCode, RequestStatus } from 'src/types';

describe('initialize (ApiCall)', () => {
  it('builds a new ApiCall request', () => {
    const event = fixtures.evm.buildClientRequest();
    const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    const parsedLog = airnodeInterface.parseLog(event);
    const parsedLogWithMetadata = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    expect(apiCalls.initialize(parsedLogWithMetadata)).toEqual({
      clientAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      designatedWallet: '0x3580C27eDAafdb494973410B794f3F07fFAEa5E5',
      endpointId: null,
      fulfillAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      fulfillFunctionId: '0xd3bd1464',
      encodedParameters: '0x3100000000000000000000000000000000000000000000000000000000000000',
      id: '0xca83cf24dc881ae41b79ee66ed11f7f09d235bd801891b1223a3cceb753ec3d5',
      metadata: {
        blockNumber: 10716082,
        currentBlock: 10716085,
        ignoreBlockedRequestsAfterBlocks: 20,
        transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
      },
      parameters: {},
      providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      requestCount: '1',
      requesterIndex: '2',
      status: RequestStatus.Pending,
      templateId: '0x3576f03d33eb6dd0c6305509117a9501a938aab52bb466a21fe536c1e37511b4',
      type: 'regular',
    });
  });

  it('sets the API call type', () => {
    const event = fixtures.evm.buildClientRequest();
    const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    const parsedLog = airnodeInterface.parseLog(event);
    const base = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
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
    const event = fixtures.evm.buildFullClientRequest();
    const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    const parsedLog = airnodeInterface.parseLog(event);
    const parsedLogWithMetadata = {
      parsedLog: { ...parsedLog, parameters: '' },
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const initialRequest = apiCalls.initialize(parsedLogWithMetadata);
    expect(initialRequest.parameters).toEqual({});

    const [logs, withParameters] = apiCalls.applyParameters(initialRequest);
    expect(logs).toEqual([]);
    expect(withParameters).toEqual(initialRequest);
  });

  it('decodes and adds the parameters to the request', () => {
    const event = fixtures.evm.buildShortRequest();
    const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    const parsedLog = airnodeInterface.parseLog(event);
    const parsedLogWithMetadata = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const initialRequest = apiCalls.initialize(parsedLogWithMetadata);
    expect(initialRequest.parameters).toEqual({});

    const [logs, withParameters] = apiCalls.applyParameters(initialRequest);
    expect(logs).toEqual([]);
    expect(withParameters).toEqual(initialRequest);
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
          clientAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
          fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
          fulfillFunctionId: '0x042f2b65',
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
      errorCode: RequestErrorCode.RequestParameterDecodingFailed,
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
        clientAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
        fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        fulfillFunctionId: '0x042f2b65',
        parameters:
          '0x315375000000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0616d6f756e74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
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
        fulfillAddress: '0x8099B3F45A682CDFd4f523871964f561160bD282',
        fulfillFunctionId: '0x042f2b65',
        encodedParameters:
          '0x315375000000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0616d6f756e74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
        metadata: {
          blockNumber: 10716082,
          transactionHash: '0xb1c9cce6d0f054958cf8542c5cdc6b558c6d628f8e2bac37fca0126c5793f11c',
        },
        parameters: {
          amount: '1000',
          from: 'ETH',
        },
        providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
        id: '0xc5f11c3b573a2084dd4abf946ca52f017e9fc70369cb74662bdbe13177c5bd49',
        requestCount: '12',
        requesterIndex: null,
        status: RequestStatus.Pending,
        templateId: '0xdeef41f6201160f0a8e737632663ce86327777c9a63450323bafb7fda7ffd05b',
        type: 'regular',
      },
    ]);
  });

  // TODO: get some example events to use here
  pending('updates the status of fulfilled ApiCall requests');
});
