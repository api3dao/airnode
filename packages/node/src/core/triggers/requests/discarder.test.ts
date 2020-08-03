import { ethers } from 'ethers';
import {
  ApiCall,
  ClientRequest,
  GroupedProviderRequests,
  ProviderState,
  RequestErrorCode,
  Withdrawal,
} from '../../../types';
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
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(1);
    expect(apiCalls[0].id).toEqual('apiCallId');
  });

  it('does nothing for unknown error codes', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest({ valid: false, errorCode: 9999 })],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(1);
    expect(apiCalls[0].id).toEqual('apiCallId');
  });

  it('discards requests where the requester could not be found', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest({ valid: false, errorCode: RequestErrorCode.RequesterDataNotFound })],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(0);
  });

  it('discards requests where the requester has an insufficient wallet balance', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest({ valid: false, errorCode: RequestErrorCode.InsufficientBalance })],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(0);
  });
});

describe('discardRequestsWithWithdrawals', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('discards pending API calls with pending withdrawals from the same wallet index', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest({ walletIndex: 123 })],
      walletDesignations: [],
      withdrawals: [createWithdrawalRequest({ walletIndex: 123 })],
    };

    const res = discarder.discardRequestsWithWithdrawals(state, requests);
    expect(res.apiCalls.length).toEqual(0);
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].id).toEqual('withdrawalId');
  });

  it('does nothing if API call and withdrawal wallet indices do not match', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [createApiCallRequest({ walletIndex: 123 })],
      walletDesignations: [],
      withdrawals: [createWithdrawalRequest({ walletIndex: 456 })],
    };

    const res = discarder.discardRequestsWithWithdrawals(state, requests);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0].id).toEqual('apiCallId');
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].id).toEqual('withdrawalId');
  });
});

function createApiCallRequest(params?: any): ClientRequest<ApiCall> {
  return {
    id: 'apiCallId',
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
    providerId: 'providerId',
    valid: true,
    walletIndex: 123,
    walletAddress: 'walletAddress',
    walletBalance: ethers.BigNumber.from('10'),
    walletMinimumBalance: ethers.BigNumber.from('5'),
    ...params,
  };
}

function createWithdrawalRequest(params?: any): ClientRequest<Withdrawal> {
  return {
    id: 'withdrawalId',
    requesterId: 'requesterId',
    destinationAddress: 'destinationAddress',
    providerId: 'providerId',
    valid: true,
    walletIndex: 123,
    walletAddress: 'walletAddress',
    walletBalance: ethers.BigNumber.from('10'),
    walletMinimumBalance: ethers.BigNumber.from('5'),
    ...params,
  };
}
