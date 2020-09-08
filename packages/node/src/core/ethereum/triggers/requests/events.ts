import { ethers } from 'ethers';
import * as ethereum from 'src/core/ethereum';

export const API_CALL_REQUEST_TOPICS = [
  ethereum.contracts.Airnode.topics.ApiCallRequest,
  ethereum.contracts.Airnode.topics.ApiCallShortRequest,
  ethereum.contracts.Airnode.topics.ApiCallFullRequest,
];

export const API_CALL_FULFILLED_TOPICS = [
  ethereum.contracts.Airnode.topics.ApiCallFulfilledSuccessful,
  ethereum.contracts.Airnode.topics.ApiCallFulfilledBytesSuccessful,
  ethereum.contracts.Airnode.topics.ApiCallFulfilledErrored,
  ethereum.contracts.Airnode.topics.ApiCallFulfilledFailed,
];

export const WALLET_DESIGNATION_REQUEST_TOPICS = [ethereum.contracts.Airnode.topics.WalletDesignationRequest];

export const WALLET_DESIGNATION_FULFILLED_TOPICS = [ethereum.contracts.Airnode.topics.WalletDesignationFulfilled];

export const WITHDRAWAL_REQUEST_TOPICS = [ethereum.contracts.Airnode.topics.WithdrawalRequested];

export const WITHDRAWAL_FULFILLED_TOPICS = [ethereum.contracts.Airnode.topics.WithdrawalFulfilled];

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
