import { logger } from '@api3/airnode-utilities';
import * as events from './events';
import * as encoding from '../abi-encoding';
import { airnodeRrpTopics } from '../contracts';
import {
  ApiCall,
  ApiCallType,
  Request,
  EVMEventLog,
  EVMMadeRequestLog,
  EVMFulfilledRequestLog,
  LogsData,
  UpdatedRequests,
} from '../../types';

function getApiCallType(topic: string): ApiCallType {
  switch (topic) {
    case airnodeRrpTopics.MadeTemplateRequest:
      return 'template';
    case airnodeRrpTopics.MadeFullRequest:
      return 'full';
    // This should never be reached
    default:
      throw new Error(`Unknown topic:${topic} during API call initialization`);
  }
}

export function initialize(log: EVMMadeRequestLog): Request<ApiCall> {
  const { parsedLog } = log;

  const request: Request<ApiCall> = {
    airnodeAddress: parsedLog.args.airnode,
    chainId: log.chainId,
    requesterAddress: parsedLog.args.requester,
    sponsorWalletAddress: parsedLog.args.sponsorWallet,
    encodedParameters: parsedLog.args.parameters,
    id: parsedLog.args.requestId,
    endpointId: events.isFullApiRequest(log) ? log.parsedLog.args.endpointId : null,
    fulfillAddress: parsedLog.args.fulfillAddress,
    fulfillFunctionId: parsedLog.args.fulfillFunctionId,
    metadata: {
      address: log.address,
      blockNumber: log.blockNumber,
      currentBlock: log.currentBlock,
      minConfirmations: log.minConfirmations,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
    },
    // Parameters are decoded separately
    parameters: {},
    requestCount: parsedLog.args.requesterRequestCount.toString(),
    sponsorAddress: parsedLog.args.sponsor,
    templateId: events.isTemplateApiRequest(log) ? log.parsedLog.args.templateId : null,
    type: getApiCallType(parsedLog.topic),
  };

  return request;
}

export function applyParameters(apiCalls: Request<ApiCall>[]): LogsData<Request<ApiCall>[]> {
  const { logs, requests } = apiCalls.reduce(
    (acc, apiCall) => {
      if (!apiCall.encodedParameters) {
        return {
          ...acc,
          requests: [...acc.requests, apiCall],
        };
      }

      const parameters = encoding.safeDecode(apiCall.encodedParameters);
      if (parameters === null) {
        // Drop request
        const { id, encodedParameters } = apiCall;
        const log = logger.pend('ERROR', `Request ID:${id} submitted with invalid parameters: ${encodedParameters}`);
        return {
          ...acc,
          logs: [...acc.logs, log],
        };
      }

      return {
        ...acc,
        requests: [...acc.requests, { ...apiCall, parameters }],
      };
    },
    { logs: [], requests: [] } as UpdatedRequests<ApiCall>
  );
  return [logs, requests];
}

export function dropFulfilledRequests(
  apiCalls: Request<ApiCall>[],
  fulfilledRequestIds: string[]
): LogsData<Request<ApiCall>[]> {
  const { logs, requests } = apiCalls.reduce(
    (acc, apiCall) => {
      if (fulfilledRequestIds.includes(apiCall.id)) {
        // Drop request
        const log = logger.pend('DEBUG', `Request ID:${apiCall.id} (API call) has already been fulfilled`);

        return { ...acc, logs: [...acc.logs, log] };
      }

      return { ...acc, requests: [...acc.requests, apiCall] };
    },
    { logs: [], requests: [] } as UpdatedRequests<ApiCall>
  );

  return [logs, requests];
}

export function mapRequests(logsWithMetadata: EVMEventLog[]): LogsData<Request<ApiCall>[]> {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isApiCallRequest(log)) as EVMMadeRequestLog[];
  const fulfillmentLogs = logsWithMetadata.filter((log) =>
    events.isApiCallFulfillment(log)
  ) as EVMFulfilledRequestLog[];

  // Cast raw logs to typed API request objects
  const apiCallRequests = requestLogs.map(initialize);

  // Decode and apply parameters for each API call or drop if error
  const [parameterLogs, parameterizedRequests] = applyParameters(apiCallRequests);

  // Drop requests that have already been fulfilled
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.requestId);
  const [fulfilledLogs, apiCallsWithFulfillments] = dropFulfilledRequests(parameterizedRequests, fulfilledRequestIds);

  const logs = [...parameterLogs, ...fulfilledLogs];
  return [logs, apiCallsWithFulfillments];
}
