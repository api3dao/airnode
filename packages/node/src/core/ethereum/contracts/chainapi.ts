import { ethers } from 'ethers';
import compiledContract from './json/chainapi.json';
import { Contract } from './types';

const ApiCallRequestTopic = ethers.utils.id(
  'RequestMade(bytes32,bytes32,address,bytes32,address,bytes4,address,bytes4,bytes)'
);
const ApiCallShortRequestTopic = ethers.utils.id('ShortRequestMade(bytes32,bytes32,address,bytes32,bytes)');
const ApiCallFullRequestTopic = ethers.utils.id(
  'FullRequestMade(bytes32,bytes32,address,bytes32,address,bytes4,address,bytes4,bytes)'
);

const ApiCallFulfillmentSuccessfulTopic = ethers.utils.id('FulfillmentSuccessful(bytes32,bytes32,bytes32)');
const ApiCallFulfillmentBytesSuccessfulTopic = ethers.utils.id('FulfillmentBytesSuccessful(bytes32,bytes32,bytes)');
const ApiCallFulfillmentErroredTopic = ethers.utils.id('FulfillmentErrored(bytes32,bytes32,uint256)');
const ApiCallFulfillmentFailedTopic = ethers.utils.id('FulfillmentFailed(bytes32,bytes32)');

const WalletDesignationRequestTopic = ethers.utils.id('ProviderWalletReserved(bytes32,bytes32,uint256,uint256)');
const WalletDesignationFulfilledTopic = ethers.utils.id('ProviderWalletAuthorized(bytes32,bytes32,address,uint256)');

const WithdrawRequestedTopic = ethers.utils.id('WithdrawRequested(bytes32,bytes32,bytes32,address)');
const WithdrawFulfilledTopic = ethers.utils.id('WithdrawFulfilled(bytes32,bytes32,address,uint256)');

export const ChainAPI: Contract = {
  addresses: {
    1: '<TODO>',
    3: '<TODO>',
    1337: '0xE099865BacFC4B9210025601196BbBf842BfEfe4',
  },
  ABI: compiledContract.abi,
  topics: {
    // Requests
    ApiCallRequest: ApiCallRequestTopic,
    ApiCallShortRequest: ApiCallShortRequestTopic,
    ApiCallFullRequest: ApiCallFullRequestTopic,

    // Fulfillments
    ApiCallFulfillmentSuccessful: ApiCallFulfillmentSuccessfulTopic,
    ApiCallFulfillmentBytesSuccessful: ApiCallFulfillmentBytesSuccessfulTopic,
    ApiCallFulfillmentErrored: ApiCallFulfillmentErroredTopic,
    ApiCallFulfillmentFailed: ApiCallFulfillmentFailedTopic,

    // Wallet authorizations
    WalletDesignationRequest: WalletDesignationRequestTopic,
    WalletDesignationFulfilled: WalletDesignationFulfilledTopic,

    // Withdrawals
    WithdrawRequested: WithdrawRequestedTopic,
    WithdrawFulfilled: WithdrawFulfilledTopic,
  },
};
