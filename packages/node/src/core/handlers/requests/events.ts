import { ethers } from 'ethers';
import * as ethereum from '../../ethereum';

export const API_REQUEST_TOPICS = [
  ethereum.contracts.ChainAPI.topics.RequestMade,
  ethereum.contracts.ChainAPI.topics.FullRequestMade,
];

export const API_REQUEST_FULFILLMENT_TOPICS = [
  ethereum.contracts.ChainAPI.topics.FulfillmentSuccessful,
  ethereum.contracts.ChainAPI.topics.FulfillmentBytesSuccessful,
  ethereum.contracts.ChainAPI.topics.FulfillmentErrored,
  ethereum.contracts.ChainAPI.topics.FulfillmentFailed,
];

export const WITHDRAWAL_TOPICS = [ethereum.contracts.ChainAPI.topics.WithdrawRequested];

export const WITHDRAWAL_FULFILLMENT_TOPICS = [ethereum.contracts.ChainAPI.topics.WithdrawFulfilled];

export function isApiRequestEvent(log: ethers.utils.LogDescription) {
  return API_REQUEST_TOPICS.includes(log.topic);
}

export function isApiRequestFulfillmentEvent(log: ethers.utils.LogDescription) {
  return API_REQUEST_FULFILLMENT_TOPICS.includes(log.topic);
}

export function isWithdrawalEvent(log: ethers.utils.LogDescription) {
  return WITHDRAWAL_TOPICS.includes(log.topic);
}

export function isWithdrawalFulfillmentEvent(log: ethers.utils.LogDescription) {
  return WITHDRAWAL_FULFILLMENT_TOPICS.includes(log.topic);
}
