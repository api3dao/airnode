import { ethers } from 'ethers';
import { ApiCall, DirectRequest, GroupedProviderRequests, ProviderState, RequestErrorCode } from '../../../types';
import * as providerState from '../../providers/state';
import * as discarder from './discarder';

describe('discardUnprocessableRequests', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('does nothing if the request is valid', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest()],
      walletAuthorizations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(1);
    expect(apiCalls[0].id).toEqual('requestId');
  });

  it('does nothing for unknown error codes', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest({ valid: false, errorCode: 9999 })],
      walletAuthorizations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(1);
    expect(apiCalls[0].id).toEqual('requestId');
  });

  it('discards requests where the requester could not be found', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest({ valid: false, errorCode: RequestErrorCode.RequesterDataNotFound })],
      walletAuthorizations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(0);
  });

  it('discards requests where the requester has an insufficient wallet balance', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest({ valid: false, errorCode: RequestErrorCode.InsufficientBalance })],
      walletAuthorizations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(0);
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
