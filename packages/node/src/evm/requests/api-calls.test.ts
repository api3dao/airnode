import * as apiCalls from './api-calls';
import { parseAirnodeRrpLog } from './event-logs';
import { EVMMadeRequestLog, RequestErrorCode, RequestStatus } from '../../types';
import * as fixtures from '../../../test/fixtures';

describe('initialize (ApiCall)', () => {
  it('builds a new ApiCall request', () => {
    const event = fixtures.evm.logs.buildMadeTemplateRequest();
    const parsedLog = parseAirnodeRrpLog<'MadeTemplateRequest'>(event);
    const parsedLogWithMetadata = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    expect(apiCalls.initialize(parsedLogWithMetadata)).toEqual({
      airnodeId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      chainId: '31337',
      clientAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      designatedWallet: '0xD748Bc4212d8130879Ec4F24B950cAAb9EddfCB2',
      endpointId: null,
      fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      fulfillFunctionId: '0x48a4157c',
      encodedParameters:
        '0x316262000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f0000000000000000000000000000000000000000000000000000000000005553440000000000000000000000000000000000000000000000000000000000',
      id: '0x676274e2d1979dbdbd0b6915276fcb2cc3fb3be32862eab9d1d201882edc8c93',
      metadata: {
        blockNumber: 10716082,
        currentBlock: 10716085,
        ignoreBlockedRequestsAfterBlocks: 20,
        transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
      },
      parameters: {},
      requestCount: '1',
      requesterIndex: '5',
      status: RequestStatus.Pending,
      templateId: '0x41e0458b020642796b14db9bb790bcdebab805ec4b639232277f0e007b088796',
      type: 'regular',
    });
  });

  it('sets the API call type', () => {
    const event = fixtures.evm.logs.buildMadeTemplateRequest();
    const parsedLog = parseAirnodeRrpLog<'MadeTemplateRequest'>(event);
    const base = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const regular = {
      ...base,
      parsedLog: { ...base.parsedLog, topic: '0x8339fddbb81e588a9ed04dec82ee9ae6c7a185f44835adaaa2ace50ce3a14aaf' },
    };
    const full = {
      ...base,
      parsedLog: { ...base.parsedLog, topic: '0xe8ae99161b1547fd1c6ff3cb9660293fa4cd770fd52f72ff0362d64d8bccc08e' },
    };

    expect(apiCalls.initialize(regular).type).toEqual('regular');
    expect(apiCalls.initialize(full).type).toEqual('full');
  });
});

describe('applyParameters', () => {
  let mutableParsedLogWithMetadata: EVMMadeRequestLog;

  beforeEach(() => {
    const event = fixtures.evm.logs.buildMadeTemplateRequest();
    const parsedLog = parseAirnodeRrpLog<'MadeTemplateRequest'>(event);
    mutableParsedLogWithMetadata = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
  });

  it('does nothing if encodedParameters is falsey', () => {
    const request = apiCalls.initialize(mutableParsedLogWithMetadata);
    expect(request.parameters).toEqual({});
    const withEncodedParams = { ...request, encodedParameters: '' };
    const [logs, withDecodedParameters] = apiCalls.applyParameters(withEncodedParams);
    expect(logs).toEqual([]);
    expect(withDecodedParameters).toEqual(withEncodedParams);
  });

  it('decodes and adds the parameters to the request', () => {
    const request = apiCalls.initialize(mutableParsedLogWithMetadata);
    expect(request.parameters).toEqual({});
    const [logs, withDecodedParameters] = apiCalls.applyParameters(request);
    expect(logs).toEqual([]);
    expect(withDecodedParameters).toEqual({ ...request, parameters: { from: 'ETH', to: 'USD' } });
  });

  it('sets the request to errored if the parameters cannot be decoded', () => {
    const request = apiCalls.initialize(mutableParsedLogWithMetadata);
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
    const id = '0xca83cf24dc881ae41b79ee66ed11f7f09d235bd801891b1223a3cceb753ec3d5';
    const apiCall = fixtures.requests.buildApiCall({ id });
    const [logs, requests] = apiCalls.updateFulfilledRequests([apiCall], [id]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${id} (API call) has already been fulfilled`,
      },
    ]);
    expect(requests).toEqual([
      {
        id,
        airnodeId: 'airnodeId',
        chainId: '31337',
        clientAddress: 'clientAddress',
        designatedWallet: 'designatedWallet',
        endpointId: 'endpointId',
        fulfillAddress: 'fulfillAddress',
        fulfillFunctionId: 'fulfillFunctionId',
        encodedParameters: 'encodedParameters',
        metadata: {
          blockNumber: 10716082,
          currentBlock: 10716090,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: 'logTransactionHash',
        },
        parameters: { from: 'ETH' },
        requestCount: '12',
        requesterIndex: '3',
        status: RequestStatus.Fulfilled,
        templateId: null,
        type: 'regular',
      },
    ]);
  });

  it('returns the request if it is not fulfilled', () => {
    const apiCall = fixtures.requests.buildApiCall();
    const [logs, requests] = apiCalls.updateFulfilledRequests([apiCall], []);
    expect(logs).toEqual([]);
    expect(requests).toEqual([apiCall]);
  });
});

describe('mapRequests (ApiCall)', () => {
  it('initializes, applies parameters and returns API call requests', () => {
    const event = fixtures.evm.logs.buildMadeTemplateRequest();
    const parsedLog = parseAirnodeRrpLog<'MadeTemplateRequest'>(event);
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
        airnodeId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        chainId: '31337',
        clientAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        designatedWallet: '0xD748Bc4212d8130879Ec4F24B950cAAb9EddfCB2',
        endpointId: null,
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x48a4157c',
        encodedParameters:
          '0x316262000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f0000000000000000000000000000000000000000000000000000000000005553440000000000000000000000000000000000000000000000000000000000',
        id: '0x676274e2d1979dbdbd0b6915276fcb2cc3fb3be32862eab9d1d201882edc8c93',
        metadata: {
          blockNumber: 10716082,
          currentBlock: 10716085,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
        },
        parameters: { from: 'ETH', to: 'USD' },
        requestCount: '1',
        requesterIndex: '5',
        status: RequestStatus.Pending,
        templateId: '0x41e0458b020642796b14db9bb790bcdebab805ec4b639232277f0e007b088796',
        type: 'regular',
      },
    ]);
  });

  it('updates the status of fulfilled ApiCall requests', () => {
    const requestEvent = fixtures.evm.logs.buildMadeTemplateRequest();
    const fulfillEvent = fixtures.evm.logs.buildTemplateFulfilledRequest();
    const requestLog = parseAirnodeRrpLog<'MadeTemplateRequest'>(requestEvent);
    const fulfillLog = parseAirnodeRrpLog<'FulfilledRequest'>(fulfillEvent);

    const requestLogWithMetadata = {
      parsedLog: requestLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const fulfillLogWithMetadata = {
      parsedLog: fulfillLog,
      blockNumber: 10716084,
      currentBlock: 10716087,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    const [logs, requests] = apiCalls.mapRequests([requestLogWithMetadata, fulfillLogWithMetadata]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${requestLog.args.requestId} (API call) has already been fulfilled`,
      },
    ]);
    expect(requests.length).toEqual(1);
    expect(requests[0].id).toEqual(requestLog.args.requestId);
    expect(requests[0].status).toEqual(RequestStatus.Fulfilled);
  });
});
