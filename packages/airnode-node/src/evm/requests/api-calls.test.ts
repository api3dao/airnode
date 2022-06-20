import { MadeTemplateRequestEvent } from '@api3/airnode-protocol';
import * as apiCalls from './api-calls';
import { parseAirnodeRrpLog } from './event-logs';
import { EVMMadeRequestLog, EVMFulfilledRequestLog } from '../../types';
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
      minConfirmations: 0,
      transactionHash: event.transactionHash,
      logIndex: 0,
      chainId: '31337',
    };

    expect(apiCalls.initialize(parsedLogWithMetadata)).toEqual({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      chainId: '31337',
      requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      sponsorAddress: '0x61648B2Ec3e6b3492E90184Ef281C2ba28a675ec',
      sponsorWalletAddress: '0x91Fa5bf7FE3cF2a8970B031b1EB6f824fFe228BE',
      endpointId: null,
      fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      fulfillFunctionId: '0x7c1de7e1',
      encodedParameters:
        '0x317300000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
      id: '0x894580d6cffd205170373f9b95adfe58b65d63f273bb9945e81fa5f0d7901ffe',
      metadata: {
        address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        blockNumber: 10716082,
        currentBlock: 10716085,
        minConfirmations: 0,
        transactionHash: event.transactionHash,
        logIndex: 0,
      },
      parameters: {},
      requestCount: '1',
      templateId: '0xb3df2ca7646e7823c18038ed320ae3fa29bcd7452fdcd91398833da362df1b46',
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
      minConfirmations: 0,
      transactionHash: event.transactionHash,
      logIndex: 0,
      chainId: '31337',
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
      minConfirmations: 0,
      transactionHash: event.transactionHash,
      logIndex: 0,
      chainId: '31337',
    };
  });

  it('does nothing if encodedParameters is falsey', () => {
    const request = apiCalls.initialize(mutableParsedLogWithMetadata);
    expect(request.parameters).toEqual({});
    const withEncodedParams = { ...request, encodedParameters: '' };
    const [logs, withDecodedParameters] = apiCalls.applyParameters([withEncodedParams]);
    expect(logs).toEqual([]);
    expect(withDecodedParameters).toEqual([withEncodedParams]);
  });

  it('decodes and adds the parameters to the request', () => {
    const request = apiCalls.initialize(mutableParsedLogWithMetadata);
    expect(request.parameters).toEqual({});
    const [logs, withDecodedParameters] = apiCalls.applyParameters([request]);
    expect(logs).toEqual([]);
    expect(withDecodedParameters).toEqual([{ ...request, parameters: { from: 'ETH' } }]);
  });

  it('drops the request if the parameters cannot be decoded', () => {
    const request = apiCalls.initialize(mutableParsedLogWithMetadata);
    expect(request.parameters).toEqual({});
    const withEncodedParams = { ...request, encodedParameters: '0xincorrectparameters' };
    const [logs, withDecodedParameters] = apiCalls.applyParameters([withEncodedParams]);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Request ID:${request.id} submitted with invalid parameters: 0xincorrectparameters`,
      },
    ]);
    expect(withDecodedParameters.length).toEqual(0);
  });
});

describe('updateFulfilledRequests (ApiCall)', () => {
  it('drops fulfilled API calls', () => {
    const id = '0xca83cf24dc881ae41b79ee66ed11f7f09d235bd801891b1223a3cceb753ec3d5';
    const apiCall = fixtures.requests.buildApiCall({ id });
    const [logs, requests] = apiCalls.dropFulfilledRequests([apiCall], [id]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${id} (API call) has already been fulfilled`,
      },
    ]);
    expect(requests.length).toEqual(0);
  });

  it('returns the request if it is not fulfilled', () => {
    const apiCall = fixtures.requests.buildApiCall();
    const [logs, requests] = apiCalls.dropFulfilledRequests([apiCall], []);
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
      minConfirmations: 0,
      transactionHash: event.transactionHash,
      logIndex: 0,
      chainId: '31337',
    };
    const [logs, res] = apiCalls.mapRequests([parsedLogWithMetadata]);
    expect(logs).toEqual([]);
    expect(res).toEqual([
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorAddress: '0x61648B2Ec3e6b3492E90184Ef281C2ba28a675ec',
        sponsorWalletAddress: '0x91Fa5bf7FE3cF2a8970B031b1EB6f824fFe228BE',
        endpointId: null,
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        encodedParameters:
          '0x317300000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
        id: '0x894580d6cffd205170373f9b95adfe58b65d63f273bb9945e81fa5f0d7901ffe',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 10716082,
          currentBlock: 10716085,
          minConfirmations: 0,
          transactionHash: event.transactionHash,
          logIndex: 0,
        },
        parameters: { from: 'ETH' },
        requestCount: '1',
        templateId: '0xb3df2ca7646e7823c18038ed320ae3fa29bcd7452fdcd91398833da362df1b46',
        type: 'template',
      },
    ]);
  });

  it('drops fulfilled ApiCall requests', () => {
    const requestEvent = fixtures.evm.logs.buildMadeTemplateRequest();
    const fulfillEvent = fixtures.evm.logs.buildTemplateFulfilledRequest();
    const requestLog = parseAirnodeRrpLog<MadeTemplateRequestEvent>(requestEvent);
    const fulfillLog = parseAirnodeRrpLog<EVMFulfilledRequestLog>(fulfillEvent);

    const requestLogWithMetadata = {
      parsedLog: requestLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716082,
      currentBlock: 10716085,
      minConfirmations: 0,
      transactionHash: requestEvent.transactionHash,
      logIndex: 0,
      chainId: '31337',
    };
    const fulfillLogWithMetadata = {
      parsedLog: fulfillLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716084,
      currentBlock: 10716087,
      minConfirmations: 0,
      transactionHash: fulfillEvent.transactionHash,
      logIndex: 0,
      chainId: '31337',
    };

    const [logs, requests] = apiCalls.mapRequests([requestLogWithMetadata, fulfillLogWithMetadata]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${requestLog.args.requestId} (API call) has already been fulfilled`,
      },
    ]);
    expect(requests.length).toEqual(0);
  });
});
