import { ethers } from 'ethers';
import { ApiCall, ClientRequest } from '../../../src/types';

export function createApiCall(params?: any): ClientRequest<ApiCall> {
  return {
    id: 'apiCallId',
    requesterId: 'requesterId',
    requesterAddress: 'requesterAddress',
    endpointId: 'endpointId',
    templateId: null,
    fulfillAddress: 'fulfillAddress',
    fulfillFunctionId: 'fulfillFunctionId',
    errorAddress: 'errorAddress',
    errorFunctionId: 'errorFunctionId',
    encodedParameters: 'encodedParameters',
    parameters: { from: 'ETH' },
    providerId: 'providerId',
    valid: true,
    walletIndex: 123,
    walletAddress: 'walletAddress',
    walletBalance: ethers.BigNumber.from('10'),
    walletMinimumBalance: ethers.BigNumber.from('5'),
    ...params,
  };
}
