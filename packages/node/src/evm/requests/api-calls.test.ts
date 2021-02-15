import { ethers } from 'ethers';
import * as contracts from '../contracts';
import * as fixtures from 'test/fixtures';
import * as apiCalls from './api-calls';
import { EVMEventLogWithMetadata, RequestErrorCode, RequestStatus } from 'src/types';

describe('initialize (ApiCall)', () => {
  it('builds a new ApiCall request', () => {
    const event = fixtures.evm.logs.buildClientRequest();
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
      designatedWallet: '0xa46c4b41d72Ada9D14157b28A8a2Db97560fFF12',
      endpointId: null,
      fulfillAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      fulfillFunctionId: '0x48a4157c',
      encodedParameters:
        '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
      id: '0x7073d6a5530629274041f7766f4c3b94118c8cd2932c8af27b166e1c3cd94e30',
      metadata: {
        blockNumber: 10716082,
        currentBlock: 10716085,
        ignoreBlockedRequestsAfterBlocks: 20,
        transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
      },
      parameters: {},
      providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      requestCount: '2',
      requesterIndex: '2',
      status: RequestStatus.Pending,
      templateId: '0xe315dcd8305800ebdf4c188fa85c602387d36df23de6927d28820d695a3c0deb',
      type: 'regular',
    });
  });

  it('sets the API call type', () => {
    const event = fixtures.evm.logs.buildClientRequest();
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
  let parsedLogWithMetadata: EVMEventLogWithMetadata;

  beforeEach(() => {
    const event = fixtures.evm.logs.buildShortClientRequest();
    const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    const parsedLog = airnodeInterface.parseLog(event);
    parsedLogWithMetadata = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
  });

  it('does nothing if encodedParameters is falsey', () => {
    const request = apiCalls.initialize(parsedLogWithMetadata);
    expect(request.parameters).toEqual({});
    const withEncodedParams = { ...request, encodedParameters: '' };
    const [logs, withDecodedParameters] = apiCalls.applyParameters(withEncodedParams);
    expect(logs).toEqual([]);
    expect(withDecodedParameters).toEqual(withEncodedParams);
  });

  it('decodes and adds the parameters to the request', () => {
    const request = apiCalls.initialize(parsedLogWithMetadata);
    expect(request.parameters).toEqual({});
    const [logs, withDecodedParameters] = apiCalls.applyParameters(request);
    expect(logs).toEqual([]);
    expect(withDecodedParameters).toEqual({ ...request, parameters: { from: 'ETH' } });
  });

  it('sets the request to errored if the parameters cannot be decoded', () => {
    const request = apiCalls.initialize(parsedLogWithMetadata);
    expect(request.parameters).toEqual({});
    const withEncodedParams = { ...request, encodedParameters: '0xincorrectparameters' };
    const [logs, withDecodedParameters] = apiCalls.applyParameters(withEncodedParams);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Request ID:${request.id} submitted with invalid parameters: 0xincorrectparameters`,
      },
    ]);
    expect(withDecodedParameters).toEqual({
      ...withEncodedParams,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.RequestParameterDecodingFailed,
    });
  });
});

describe('updateFulfilledRequests (ApiCall)', () => {
  it('updates the status of fulfilled API calls', () => {
    // const id = '0xca83cf24dc881ae41b79ee66ed11f7f09d235bd801891b1223a3cceb753ec3d5';
    // const apiCall = fixtures.requests.createApiCall({ id });
    // const [logs, requests] = apiCalls.updateFulfilledRequests([apiCall], [id]);
    // expect(logs).toEqual([
    //   {
    //     level: 'DEBUG',
    //     message: `Request ID:${id} (API call) has already been fulfilled`,
    //   },
    // ]);
    // expect(requests).toEqual([
    //   {
    //     id,
    //     clientAddress: 'clientAddress',
    //     designatedWallet: 'designatedWallet',
    //     endpointId: 'endpointId',
    //     fulfillAddress: 'fulfillAddress',
    //     fulfillFunctionId: 'fulfillFunctionId',
    //     encodedParameters: 'encodedParameters',
    //     metadata: {
    //       blockNumber: 10716082,
    //       currentBlock: 10716090,
    //       ignoreBlockedRequestsAfterBlocks: 20,
    //       transactionHash: 'logTransactionHash',
    //     },
    //     parameters: { from: 'ETH' },
    //     providerId: 'providerId',
    //     requestCount: '12',
    //     requesterIndex: '3',
    //     status: RequestStatus.Fulfilled,
    //     templateId: null,
    //     type: 'regular',
    //   },
    // ]);
  });

  it('returns the request if it is not fulfilled', () => {
    const apiCall = fixtures.requests.createApiCall();
    const [logs, requests] = apiCalls.updateFulfilledRequests([apiCall], []);
    expect(logs).toEqual([]);
    expect(requests).toEqual([apiCall]);
  });
});

describe('mapRequests (ApiCall)', () => {
  it('initializes, applies parameters and returns API call requests', () => {
    const event = fixtures.evm.logs.buildShortClientRequest();
    const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    const parsedLog = airnodeInterface.parseLog(event);
    const parsedLogWithMetadata = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const [logs, res] = apiCalls.mapRequests([parsedLogWithMetadata]);
    expect(logs).toEqual([]);
    expect(res).toEqual([
      {
        clientAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        designatedWallet: null,
        endpointId: null,
        fulfillAddress: null,
        fulfillFunctionId: null,
        encodedParameters:
          '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
        id: '0x00521e2c0d72ebe2c47a07e79262dcca197ef5308e8d6873e8233821231421d1',
        metadata: {
          blockNumber: 10716082,
          currentBlock: 10716085,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
        },
        parameters: { from: 'ETH' },
        providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        requestCount: '1',
        requesterIndex: null,
        status: RequestStatus.Pending,
        templateId: '0xe315dcd8305800ebdf4c188fa85c602387d36df23de6927d28820d695a3c0deb',
        type: 'short',
      },
    ]);
  });

  it('updates the status of fulfilled ApiCall requests', () => {
    // const requestEvent = fixtures.evm.logs.buildClientRequest();
    // const fulfillEvent = fixtures.evm.logs.buildClientRequestFulfilled();
    // const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    // const requestLog = airnodeInterface.parseLog(requestEvent);
    // const fulfillLog = airnodeInterface.parseLog(fulfillEvent);
    //
    // const requestLogWithMetadata = {
    //   parsedLog: requestLog,
    //   blockNumber: 10716082,
    //   currentBlock: 10716085,
    //   ignoreBlockedRequestsAfterBlocks: 20,
    //   transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    // };
    // const fulfillLogWithMetadata = {
    //   parsedLog: fulfillLog,
    //   blockNumber: 10716084,
    //   currentBlock: 10716087,
    //   ignoreBlockedRequestsAfterBlocks: 20,
    //   transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    // };
    //
    // const [logs, requests] = apiCalls.mapRequests([requestLogWithMetadata, fulfillLogWithMetadata]);
    // expect(logs).toEqual([
    //   {
    //     level: 'DEBUG',
    //     message: `Request ID:${requestLog.args.requestId} (API call) has already been fulfilled`,
    //   },
    // ]);
    // expect(requests.length).toEqual(1);
    // expect(requests[0].id).toEqual(requestLog.args.requestId);
    // expect(requests[0].status).toEqual(RequestStatus.Fulfilled);
  });
});
