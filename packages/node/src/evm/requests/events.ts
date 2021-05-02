import {
  EVMEventLog,
  EVMRequestCreatedLog,
  EVMRequestFulfilledLog,
  EVMWithdrawalRequestLog,
  EVMWithdrawalFulfilledLog,
  EVMFullApiRequestCreatedLog,
  EVMTemplateRequestCreatedLog,
} from '../../types';
import { airnodeRrpTopics } from '../contracts';

export const API_CALL_REQUEST_TOPICS = [
  airnodeRrpTopics.ClientRequestCreated,
  airnodeRrpTopics.ClientFullRequestCreated,
];

export const API_CALL_FULFILLED_TOPICS = [
  airnodeRrpTopics.ClientRequestFulfilled,
  airnodeRrpTopics.ClientRequestFailed,
];

export const WITHDRAWAL_REQUEST_TOPICS = [airnodeRrpTopics.WithdrawalRequested];

export const WITHDRAWAL_FULFILLED_TOPICS = [airnodeRrpTopics.WithdrawalFulfilled];

export function isApiCallRequest(log: EVMEventLog): log is EVMRequestCreatedLog {
  return API_CALL_REQUEST_TOPICS.includes(log.parsedLog.topic);
}

export function isTemplateApiRequest(log: EVMEventLog): log is EVMTemplateRequestCreatedLog {
  return log.parsedLog.topic === airnodeRrpTopics.ClientRequestCreated;
}

export function isFullApiRequest(log: EVMEventLog): log is EVMFullApiRequestCreatedLog {
  return log.parsedLog.topic === airnodeRrpTopics.ClientFullRequestCreated;
}

export function isApiCallFulfillment(log: EVMEventLog): log is EVMRequestFulfilledLog {
  return API_CALL_FULFILLED_TOPICS.includes(log.parsedLog.topic);
}

export function isWithdrawalRequest(log: EVMEventLog): log is EVMWithdrawalRequestLog {
  return WITHDRAWAL_REQUEST_TOPICS.includes(log.parsedLog.topic);
}

export function isWithdrawalFulfillment(log: EVMEventLog): log is EVMWithdrawalFulfilledLog {
  return WITHDRAWAL_FULFILLED_TOPICS.includes(log.parsedLog.topic);
}
