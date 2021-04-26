import { ethers } from 'ethers';
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

export function isApiCallRequest(log: ethers.utils.LogDescription) {
  return API_CALL_REQUEST_TOPICS.includes(log.topic);
}

export function isApiCallFulfillment(log: ethers.utils.LogDescription) {
  return API_CALL_FULFILLED_TOPICS.includes(log.topic);
}

export function isWithdrawalRequest(log: ethers.utils.LogDescription) {
  return WITHDRAWAL_REQUEST_TOPICS.includes(log.topic);
}

export function isWithdrawalFulfillment(log: ethers.utils.LogDescription) {
  return WITHDRAWAL_FULFILLED_TOPICS.includes(log.topic);
}
