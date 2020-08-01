import { ethers } from 'ethers';
import * as ethereum from '../../ethereum';

export const API_CALL_REQUEST_TOPICS = [
  ethereum.contracts.ChainAPI.topics.ApiCallRequestRequest,
  ethereum.contracts.ChainAPI.topics.ApiCallShortRequest,
  ethereum.contracts.ChainAPI.topics.ApiCallFullRequest,
];

export const API_CALL_FULFILLMENT_TOPICS = [
  ethereum.contracts.ChainAPI.topics.ApiCallFulfillmentSuccessful,
  ethereum.contracts.ChainAPI.topics.ApiCallFulfillmentBytesSuccessful,
  ethereum.contracts.ChainAPI.topics.ApiCallFulfillmentErrored,
  ethereum.contracts.ChainAPI.topics.ApiCallFulfillmentFailed,
];

export const WALLET_DESIGNATION_REQUEST_TOPICS = [
  ethereum.contracts.ChainAPI.topics.WalletDesignationRequest,
];

export const WALLET_DESIGNATION_FULFILLED_TOPICS = [
  ethereum.contracts.ChainAPI.topics.WalletDesignationFulfilled,
];

export const WITHDRAWAL_REQUEST_TOPICS = [ethereum.contracts.ChainAPI.topics.WithdrawRequested];

export const WITHDRAWAL_FULFILLMENT_TOPICS = [ethereum.contracts.ChainAPI.topics.WithdrawFulfilled];

export function isApiCallRequest(log: ethers.utils.LogDescription) {
  return API_CALL_REQUEST_TOPICS.includes(log.topic);
}

export function isApiCallFulfillment(log: ethers.utils.LogDescription) {
  return API_CALL_FULFILLMENT_TOPICS.includes(log.topic);
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
  return WITHDRAWAL_FULFILLMENT_TOPICS.includes(log.topic);
}
