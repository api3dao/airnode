import { MadeTemplateRequestEvent } from '@api3/protocol';
import * as apiCalls from './api-calls';
import { parseAirnodeRrpLog } from './event-logs';
import { EVMMadeRequestLog, RequestErrorMessage, RequestStatus, EVMFulfilledRequestLog } from '../../types';
import * as fixtures from '../../../test/fixtures';

describe('initialize (ApiCall)', () => {
  it('builds a new ApiCall request', () => {
    const event = fixtures.evm.logs.buildMadeTemplateRequest();
    const parsedLog = parseAirnodeRrpLog<MadeTemplateRequestEvent>(event);
    const parsedLogWithMetadata = {
      parsedLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    expect(apiCalls.initialize(parsedLogWithMetadata)).toEqual({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      chainId: '31337',
      requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      sponsorAddress: '0x61648B2Ec3e6b3492E90184Ef281C2ba28a675ec',
      sponsorWalletAddress: '0x654B6d01E1A03eeF91F50D79203Ace648be81350',
      endpointId: null,
      fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      fulfillFunctionId: '0x7c1de7e1',
      encodedParameters:
        '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
      id: '0xbb7a523ebcb9c151457d6ea26ced6bbc0fab1aa7f170156bd0f63a295e5f8e16',
      metadata: {
        address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        blockNumber: 10716082,
        currentBlock: 10716085,
        ignoreBlockedRequestsAfterBlocks: 20,
        transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
      },
      parameters: {},
      requestCount: '1',
      status: RequestStatus.Pending,
      templateId: '0xe4a1b9c33b9dda81f38b6e84c1bf59fcf5dd197039efc34edfaa61cfeb01b217',
      type: 'template',
    });
  });

  it('sets the API call type', () => {
    const event = fixtures.evm.logs.buildMadeTemplateRequest();
    const parsedLog = parseAirnodeRrpLog<MadeTemplateRequestEvent>(event);
    const base = {
      parsedLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const template = {
      ...base,
      parsedLog: { ...base.parsedLog, topic: '0xeb39930cdcbb560e6422558a2468b93a215af60063622e63cbb165eba14c3203' },
    };
    const full = {
      ...base,
      parsedLog: { ...base.parsedLog, topic: '0x3a52c462346de2e9436a3868970892956828a11b9c43da1ed43740b12e1125ae' },
    };

    expect(apiCalls.initialize(template).type).toEqual('template');
    expect(apiCalls.initialize(full).type).toEqual('full');
  });
});

describe('applyParameters', () => {
  let mutableParsedLogWithMetadata: EVMMadeRequestLog;

  beforeEach(() => {
    const event = fixtures.evm.logs.buildMadeTemplateRequest();
    const parsedLog = parseAirnodeRrpLog<MadeTemplateRequestEvent>(event);
    mutableParsedLogWithMetadata = {
      parsedLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
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
    expect(withDecodedParameters).toEqual({ ...request, parameters: { from: 'ETH' } });
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
      errorMessage: `${RequestErrorMessage.RequestParameterDecodingFailed}: 0xincorrectparameters`,
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
        airnodeAddress: 'airnodeAddress',
        chainId: '31337',
        requesterAddress: 'requesterAddress',
        sponsorAddress: 'sponsorAddress',
        sponsorWalletAddress: 'sponsorWalletAddress',
        endpointId: 'endpointId',
        fulfillAddress: 'fulfillAddress',
        fulfillFunctionId: 'fulfillFunctionId',
        encodedParameters: 'encodedParameters',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 10716082,
          currentBlock: 10716090,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: 'logTransactionHash',
        },
        parameters: { from: 'ETH' },
        requestCount: '12',
        status: RequestStatus.Fulfilled,
        templateId: null,
        type: 'template',
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
    const parsedLog = parseAirnodeRrpLog<MadeTemplateRequestEvent>(event);
    const parsedLogWithMetadata = {
      parsedLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const [logs, res] = apiCalls.mapRequests([parsedLogWithMetadata]);
    expect(logs).toEqual([]);
    expect(res).toEqual([
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorAddress: '0x61648B2Ec3e6b3492E90184Ef281C2ba28a675ec',
        sponsorWalletAddress: '0x654B6d01E1A03eeF91F50D79203Ace648be81350',
        endpointId: null,
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        encodedParameters:
          '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
        id: '0xbb7a523ebcb9c151457d6ea26ced6bbc0fab1aa7f170156bd0f63a295e5f8e16',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 10716082,
          currentBlock: 10716085,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
        },
        parameters: { from: 'ETH' },
        requestCount: '1',
        status: RequestStatus.Pending,
        templateId: '0xe4a1b9c33b9dda81f38b6e84c1bf59fcf5dd197039efc34edfaa61cfeb01b217',
        type: 'template',
      },
    ]);
  });

  it('updates the status of fulfilled ApiCall requests', () => {
    const requestEvent = fixtures.evm.logs.buildMadeTemplateRequest();
    const fulfillEvent = fixtures.evm.logs.buildTemplateFulfilledRequest();
    const requestLog = parseAirnodeRrpLog<MadeTemplateRequestEvent>(requestEvent);
    const fulfillLog = parseAirnodeRrpLog<EVMFulfilledRequestLog>(fulfillEvent);

    const requestLogWithMetadata = {
      parsedLog: requestLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const fulfillLogWithMetadata = {
      parsedLog: fulfillLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
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
