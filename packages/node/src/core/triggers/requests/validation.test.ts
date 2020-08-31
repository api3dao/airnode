jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as fixtures from 'test/fixtures';
import * as providerState from '../../providers/state';
import { GroupedRequests, ProviderState, RequestErrorCode, RequestStatus } from '../../../types';
import * as validation from './validation';

describe('validation', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('does nothing if the request is already invalid', () => {
    const requests: GroupedRequests = {
      apiCalls: [
        fixtures.requests.createApiCall({ status: RequestStatus.Blocked, errorCode: 9999 }),
        fixtures.requests.createApiCall({ status: RequestStatus.Errored, errorCode: 9999 }),
      ],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = validation.validateRequests(state, requests);
    expect(apiCalls[0].status).toEqual(RequestStatus.Blocked);
    expect(apiCalls[0].errorCode).toEqual(9999);
    expect(apiCalls[1].status).toEqual(RequestStatus.Errored);
    expect(apiCalls[1].errorCode).toEqual(9999);
  });

  it('validates that the wallet index is not reserved', () => {
    const reserved = fixtures.requests.createApiCall({ walletIndex: '0' });
    const unreserved = fixtures.requests.createApiCall({ walletIndex: '1' });

    const requests: GroupedRequests = {
      apiCalls: [reserved, unreserved],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = validation.validateRequests(state, requests);
    expect(apiCalls[0].status).toEqual(RequestStatus.Errored);
    expect(apiCalls[0].errorCode).toEqual(RequestErrorCode.ReservedWalletIndex);
    expect(apiCalls[1].status).toEqual(RequestStatus.Pending);
    expect(apiCalls[1].errorCode).toEqual(undefined);
  });

  it('validates the current balance is greater than the current balance', () => {
    const sufficientBalance = fixtures.requests.createApiCall({ walletBalance: '10', walletMinimumBalance: '5' });
    const matchingBalance = fixtures.requests.createApiCall({ walletBalance: '5', walletMinimumBalance: '5' });
    const insufficientBalance = fixtures.requests.createApiCall({ walletBalance: '2', walletMinimumBalance: '5' });

    const requests: GroupedRequests = {
      apiCalls: [sufficientBalance, matchingBalance, insufficientBalance],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = validation.validateRequests(state, requests);
    expect(apiCalls[0].status).toEqual(RequestStatus.Pending);
    expect(apiCalls[0].errorCode).toEqual(undefined);
    expect(apiCalls[1].status).toEqual(RequestStatus.Pending);
    expect(apiCalls[1].errorCode).toEqual(undefined);
    expect(apiCalls[2].status).toEqual(RequestStatus.Errored);
    expect(apiCalls[2].errorCode).toEqual(RequestErrorCode.InsufficientBalance);
  });
});
