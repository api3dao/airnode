import { ethers } from 'ethers';
import * as contracts from '../contracts';

export const API_CALL_REQUEST_TOPICS = [
  contracts.AirnodeRrp.topics.ClientRequestCreated,
  contracts.AirnodeRrp.topics.ClientFullRequestCreated,
];

export const API_CALL_FULFILLED_TOPICS = [
  contracts.AirnodeRrp.topics.ClientRequestFulfilled,
  contracts.AirnodeRrp.topics.ClientRequestFailed,
];

export const WITHDRAWAL_REQUEST_TOPICS = [contracts.AirnodeRrp.topics.WithdrawalRequested];

export const WITHDRAWAL_FULFILLED_TOPICS = [contracts.AirnodeRrp.topics.WithdrawalFulfilled];

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
