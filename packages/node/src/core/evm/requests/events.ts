import { ethers } from 'ethers';
import * as contracts from '../contracts';

export const API_CALL_REQUEST_TOPICS = [
  contracts.Airnode.topics.ApiCallRequest,
  contracts.Airnode.topics.ApiCallShortRequest,
  contracts.Airnode.topics.ApiCallFullRequest,
];

export const API_CALL_FULFILLED_TOPICS = [
  contracts.Airnode.topics.ApiCallFulfilledSuccessful,
  contracts.Airnode.topics.ApiCallFulfilledBytesSuccessful,
  contracts.Airnode.topics.ApiCallFulfilledErrored,
  contracts.Airnode.topics.ApiCallFulfilledFailed,
];

export const WALLET_DESIGNATION_REQUEST_TOPICS = [contracts.Airnode.topics.WalletDesignationRequest];

export const WALLET_DESIGNATION_FULFILLED_TOPICS = [contracts.Airnode.topics.WalletDesignationFulfilled];

export const WITHDRAWAL_REQUEST_TOPICS = [contracts.Airnode.topics.WithdrawalRequested];

export const WITHDRAWAL_FULFILLED_TOPICS = [contracts.Airnode.topics.WithdrawalFulfilled];

export function isApiCallRequest(log: ethers.utils.LogDescription) {
  return API_CALL_REQUEST_TOPICS.includes(log.topic);
}

export function isApiCallFulfillment(log: ethers.utils.LogDescription) {
  return API_CALL_FULFILLED_TOPICS.includes(log.topic);
}

export function isWalletDesignationRequest(log: ethers.utils.LogDescription) {
  return WALLET_DESIGNATION_REQUEST_TOPICS.includes(log.topic);
}

export function isWalletDesignationFulfillment(log: ethers.utils.LogDescription) {
  return WALLET_DESIGNATION_FULFILLED_TOPICS.includes(log.topic);
}

export function isWithdrawalRequest(log: ethers.utils.LogDescription) {
  return WITHDRAWAL_REQUEST_TOPICS.includes(log.topic);
}

export function isWithdrawalFulfillment(log: ethers.utils.LogDescription) {
  return WITHDRAWAL_FULFILLED_TOPICS.includes(log.topic);
}
