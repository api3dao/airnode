jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import * as providerState from '../../providers/state';
import { GroupedProviderRequests, ProviderState, RequestErrorCode } from '../../../types';
import * as validator from './validator';

describe('validate', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('does nothing if the request is already invalid', () => {
    const requests: GroupedProviderRequests = {
      apiCalls: [fixtures.requests.createApiCall({ valid: false, errorCode: 9999 })],
      walletDesignations: [],
      withdrawals: [],
    };
    const { apiCalls } = validator.validateRequests(state, requests);
    expect(apiCalls[0].valid).toEqual(false);
    expect(apiCalls[0].errorCode).toEqual(9999);
  });

  it('validates that the wallet index is not reserved', () => {
    const reserved = fixtures.requests.createApiCall({ walletIndex: 0 });
    const requester = fixtures.requests.createApiCall({ walletIndex: 1 });

    const requests: GroupedProviderRequests = {
      apiCalls: [reserved, requester],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = validator.validateRequests(state, requests);

    expect(apiCalls[0].valid).toEqual(false);
    expect(apiCalls[0].errorCode).toEqual(RequestErrorCode.ReservedWalletIndex);

    expect(apiCalls[1].valid).toEqual(true);
    expect(apiCalls[1].errorCode).toEqual(undefined);
  });

  it('validates the current balance is greater than the current balance', () => {
    const sufficientBalance = fixtures.requests.createApiCall({ walletBalance: ethers.BigNumber.from('10') });
    const matchingBalance = fixtures.requests.createApiCall({ walletBalance: ethers.BigNumber.from('5') });
    const insufficientBalance = fixtures.requests.createApiCall({ walletBalance: ethers.BigNumber.from('2') });

    const requests: GroupedProviderRequests = {
      apiCalls: [sufficientBalance, matchingBalance, insufficientBalance],
      walletDesignations: [],
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
});
