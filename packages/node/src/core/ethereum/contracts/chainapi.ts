import { Contract } from './types';

export const ChainAPI: Contract = {
  addresses: {
    1: '<TODO>',
    3: '<TODO>',
  },
  ABI: [
    'event RequestMade(bytes32 indexed providerId, bytes32 requestId, address requester, bytes32 templateId, address fulfillAddress, bytes4 fulfillFunctionId, address errorAddress, bytes4 errorFunctionId, bytes parameters)',
    'event FullRequestMade(bytes32 indexed providerId, bytes32 requestId, address requester, bytes32 endpointId, address fulfillAddress, bytes4 fulfillFunctionId, address errorAddress, bytes4 errorFunctionId, bytes parameters)',
  ],
};
