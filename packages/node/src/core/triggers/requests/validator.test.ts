import { ethers } from 'ethers';
import * as providerState from '../../providers/state';
import { ApiCall, DirectRequest, GroupedProviderRequests, ProviderState, RequestErrorCode } from '../../../types';
import * as validator from './validator';

describe('validate', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('does nothing if the request is already invalid', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest({ valid: false, errorCode: 9999 })],
      walletAuthorizations: [],
      withdrawals: [],
    };
    const { apiCalls } = validator.validateRequests(state, requests);
    expect(apiCalls[0].valid).toEqual(false);
    expect(apiCalls[0].errorCode).toEqual(9999);
  });

  it('validates the current balance is greater than the current balance', () => {
    const sufficientBalance = createApiCallRequest({ walletBalance: ethers.BigNumber.from('10') });
    const matchingBalance = createApiCallRequest({ walletBalance: ethers.BigNumber.from('5') });
    const insufficientBalance = createApiCallRequest({ walletBalance: ethers.BigNumber.from('2') });

    const requests: GroupedProviderRequests = {
      apiCalls: [sufficientBalance, matchingBalance, insufficientBalance],
      walletAuthorizations: [],
      withdrawals: [],
    };

    const { apiCalls } = validator.validateRequests(state, requests);

    expect(apiCalls[0].valid).toEqual(true);
    expect(apiCalls[0].errorCode).toEqual(undefined);

    expect(apiCalls[1].valid).toEqual(true);
    expect(apiCalls[1].errorCode).toEqual(undefined);

    expect(apiCalls[2].valid).toEqual(false);
    expect(apiCalls[2].errorCode).toEqual(RequestErrorCode.InsufficientBalance);
  });

  function createApiCallRequest(params?: any): DirectRequest<ApiCall> {
    return {
      id: 'requestId',
      requesterId: 'requestId',
      requesterAddress: 'requesterAddress',
      endpointId: 'endpointId',
      templateId: null,
      fulfillAddress: 'fulfillAddress',
      fulfillFunctionId: 'fulfillFunctionId',
      errorAddress: 'errorAddress',
      errorFunctionId: 'errorFunctionId',
      encodedParameters: 'encodedParameters',
      parameters: { from: 'ETH' },
      valid: true,
      walletIndex: 123,
      walletAddress: 'walletAddress',
      walletBalance: ethers.BigNumber.from('10'),
      walletMinimumBalance: ethers.BigNumber.from('5'),
      ...params,
    };
  }
});
