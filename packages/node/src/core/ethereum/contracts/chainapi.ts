import { ethers } from 'ethers';
import compiledContract from './json/chainapi.json';
import { Contract } from './types';

const ApiCallRequestTopic = ethers.utils.id(
  'RequestMade(bytes32,bytes32,address,bytes32,address,address,bytes4,bytes4,bytes)'
);
const ApiCallShortRequestTopic = ethers.utils.id('ShortRequestMade(bytes32,bytes32,address,bytes32,bytes)');
const ApiCallFullRequestTopic = ethers.utils.id(
  'FullRequestMade(bytes32,bytes32,address,bytes32,address,address,bytes4,bytes4,bytes)'
);

const ApiCallFulfilledSuccessfulTopic = ethers.utils.id('FulfillmentSuccessful(bytes32,bytes32,bytes32)');
const ApiCallFulfilledBytesSuccessfulTopic = ethers.utils.id('FulfillmentBytesSuccessful(bytes32,bytes32,bytes)');
const ApiCallFulfilledErroredTopic = ethers.utils.id('FulfillmentErrored(bytes32,bytes32,uint256)');
const ApiCallFulfilledFailedTopic = ethers.utils.id('FulfillmentFailed(bytes32,bytes32)');

const WalletDesignationRequestTopic = ethers.utils.id(
  'WalletDesignationRequested(bytes32,bytes32,bytes32,uint256,uint256)'
);
const WalletDesignationFulfilledTopic = ethers.utils.id(
  'WalletDesignationFulfilled(bytes32,bytes32,bytes32,address,uint256)'
);

const WithdrawalRequestedTopic = ethers.utils.id('WithdrawalRequested(bytes32,bytes32,bytes32,address)');
const WithdrawalFulfilledTopic = ethers.utils.id('WithdrawalFulfilled(bytes32,bytes32,bytes32,address,uint256)');

export const ChainAPI: Contract = {
  addresses: {
    1: '<TODO>',
    3: '<TODO>',
    1337: '0xb3a67960d372d55c866A4c2C89bb44bB4b2acDCD',
  },
  ABI: compiledContract.abi,
  topics: {
    // API calls
    ApiCallRequest: ApiCallRequestTopic,
    ApiCallShortRequest: ApiCallShortRequestTopic,
    ApiCallFullRequest: ApiCallFullRequestTopic,

    ApiCallFulfilledSuccessful: ApiCallFulfilledSuccessfulTopic,
    ApiCallFulfilledBytesSuccessful: ApiCallFulfilledBytesSuccessfulTopic,
    ApiCallFulfilledErrored: ApiCallFulfilledErroredTopic,
    ApiCallFulfilledFailed: ApiCallFulfilledFailedTopic,

    // Wallet authorizations
    WalletDesignationRequest: WalletDesignationRequestTopic,
    WalletDesignationFulfilled: WalletDesignationFulfilledTopic,

    // Withdrawals
    WithdrawalRequested: WithdrawalRequestedTopic,
    WithdrawalFulfilled: WithdrawalFulfilledTopic,
  },
};
