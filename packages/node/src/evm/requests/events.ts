import {
  EVMEventLog,
  EVMMadeRequestLog,
  EVMFulfilledRequestLog,
  EVMRequestedWithdrawalLog,
  EVMFulfilledWithdrawalLog,
  EVMMadeFullRequestLog,
  EVMMadeTemplateRequestLog,
} from '../../types';
import { airnodeRrpTopics } from '../contracts';

export const API_CALL_REQUEST_TOPICS = [airnodeRrpTopics.MadeTemplateRequest, airnodeRrpTopics.MadeFullRequest];

export const API_CALL_FULFILLED_TOPICS = [airnodeRrpTopics.MadeTemplateRequest, airnodeRrpTopics.FailedRequest];

export const WITHDRAWAL_REQUEST_TOPICS = [airnodeRrpTopics.RequestedWithdrawal];

export const WITHDRAWAL_FULFILLED_TOPICS = [airnodeRrpTopics.FulfilledWithdrawal];

export function isApiCallRequest(log: EVMEventLog): log is EVMMadeRequestLog {
  return API_CALL_REQUEST_TOPICS.includes(log.parsedLog.topic);
}

export function isTemplateApiRequest(log: EVMEventLog): log is EVMMadeTemplateRequestLog {
  return log.parsedLog.topic === airnodeRrpTopics.MadeTemplateRequest;
}

export function isFullApiRequest(log: EVMEventLog): log is EVMMadeFullRequestLog {
  return log.parsedLog.topic === airnodeRrpTopics.MadeFullRequest;
}

export function isApiCallFulfillment(log: EVMEventLog): log is EVMFulfilledRequestLog {
  return API_CALL_FULFILLED_TOPICS.includes(log.parsedLog.topic);
}

export function isWithdrawalRequest(log: EVMEventLog): log is EVMRequestedWithdrawalLog {
  return WITHDRAWAL_REQUEST_TOPICS.includes(log.parsedLog.topic);
}

export function isWithdrawalFulfillment(log: EVMEventLog): log is EVMFulfilledWithdrawalLog {
  return WITHDRAWAL_FULFILLED_TOPICS.includes(log.parsedLog.topic);
}
