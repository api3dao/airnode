import { ethers } from 'ethers';
import compiledContract from './json/chainapi.json';
import { Contract } from './types';

const RequestMadeTopic = ethers.utils.id(
  'RequestMade(bytes32,bytes32,address,bytes32,address,bytes4,address,bytes4,bytes)'
);
const ShortRequestMadeTopic = ethers.utils.id('ShortRequestMade(bytes32,bytes32,address,bytes32,bytes)');
const FullRequestMadeTopic = ethers.utils.id(
  'FullRequestMade(bytes32,bytes32,address,bytes32,address,bytes4,address,bytes4,bytes)'
);

const FulfillmentSuccessfulTopic = ethers.utils.id('FulfillmentSuccessful(bytes32,bytes32,bytes32)');
const FulfillmentBytesSuccessfulTopic = ethers.utils.id('FulfillmentBytesSuccessful(bytes32,bytes32,bytes)');
const FulfillmentErroredTopic = ethers.utils.id('FulfillmentErrored(bytes32,bytes32,uint256)');
const FulfillmentFailedTopic = ethers.utils.id('FulfillmentFailed(bytes32,bytes32)');

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
    RequestMade: RequestMadeTopic,
    ShortRequestMade: ShortRequestMadeTopic,
    FullRequestMade: FullRequestMadeTopic,

    // Fulfillments
    FulfillmentSuccessful: FulfillmentSuccessfulTopic,
    FulfillmentBytesSuccessful: FulfillmentBytesSuccessfulTopic,
    FulfillmentErrored: FulfillmentErroredTopic,
    FulfillmentFailed: FulfillmentFailedTopic,

    // Withdrawals
    WithdrawRequested: WithdrawRequestedTopic,
    WithdrawFulfilled: WithdrawFulfilledTopic,
  },
};
