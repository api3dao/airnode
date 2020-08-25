const checkAuthorizationStatusesMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      Contract: jest.fn().mockImplementation(() => ({
        checkAuthorizationStatuses: checkAuthorizationStatusesMock,
      })),
    },
  };
});

jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as fixtures from 'test/fixtures';
import { ProviderState, RequestErrorCode, RequestStatus } from 'src/types';
import * as authorization from './authorization';
import * as providerState from '../../providers/state';

describe('fetch', () => {
  let initialState: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    initialState = providerState.create(config, 0);
  });

  it('calls the contract with groups of 10', async () => {
    checkAuthorizationStatusesMock.mockResolvedValueOnce(Array(10).fill(true));
    checkAuthorizationStatusesMock.mockResolvedValueOnce(Array(9).fill(true));

    const apiCalls = Array.from(Array(19).keys()).map((n) => {
      return fixtures.requests.createApiCall({
        id: `${n}`,
        endpointId: `endpointId-${n}`,
        requesterAddress: `requesterAddress-${n}`,
      });
    });

    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: apiCalls,
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });

    const res = await authorization.fetch(state);
    expect(Object.keys(res).length).toEqual(19);
    expect(res['endpointId-0']).toEqual({ 'requesterAddress-0': true });
    expect(res['endpointId-18']).toEqual({ 'requesterAddress-18': true });

    expect(checkAuthorizationStatusesMock).toHaveBeenCalledTimes(2);
    expect(checkAuthorizationStatusesMock.mock.calls).toEqual([
      [apiCalls.slice(0, 10).map((a) => a.endpointId), apiCalls.slice(0, 10).map((a) => a.requesterAddress)],
      [apiCalls.slice(10, 19).map((a) => a.endpointId), apiCalls.slice(10, 19).map((a) => a.requesterAddress)],
    ]);
  });

  it('groups by endpoint ID', async () => {
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true, false, true]);

    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-0' }),
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-1' }),
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-2' }),
    ];

    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: apiCalls,
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });

    const res = await authorization.fetch(state);
    expect(Object.keys(res).length).toEqual(1);
    expect(res['endpointId-0']).toEqual({
      'requester-0': true,
      'requester-1': false,
      'requester-2': true,
    });
  });

  it('removes duplicate endpointId and requester pairs', async () => {
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-0' }),
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-0' }),
    ];

    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: apiCalls,
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });

    const res = await authorization.fetch(state);
    expect(Object.keys(res).length).toEqual(1);
    expect(res).toEqual({
      'endpointId-0': {
        'requester-0': true,
      },
    });

    expect(checkAuthorizationStatusesMock).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationStatusesMock.mock.calls).toEqual([[['endpointId-0'], ['requester-0']]]);
  });

  it('retries once on failure', async () => {
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });

    const res = await authorization.fetch(state);
    expect(res).toEqual({
      endpointId: {
        requesterAddress: true,
      },
    });
  });

  it('retries a maximum of two times', async () => {
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });

    const res = await authorization.fetch(state);
    expect(res).toEqual({});
  });
});

describe('mergeAuthorizations', () => {
  let initialState: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    initialState = providerState.create(config, 0);
  });

  it('does nothing if the API call is already invalid', () => {
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [
          fixtures.requests.createApiCall({
            status: RequestStatus.Errored,
            errorCode: RequestErrorCode.InvalidRequestParameters,
          }),
        ],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
    const authorizationsByEndpoint = { endpointId: { requesterAddress: true } };
    const res = authorization.mergeAuthorizations(state, authorizationsByEndpoint);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Errored);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.InvalidRequestParameters);
  });

  it('blocks the request if it has no endpointId', () => {
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ endpointId: null })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
    const authorizationsByEndpoint = { endpointId: { requesterAddress: true } };
    const res = authorization.mergeAuthorizations(state, authorizationsByEndpoint);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.TemplateNotFound);
  });

  it('blocks the request if no authorization is found', () => {
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
    const res = authorization.mergeAuthorizations(state, {});
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.TemplateNotFound);
  });

  it('returns the validated request if it is authorized', () => {
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
    const authorizationsByEndpoint = { endpointId: { requesterAddress: true } };
    const res = authorization.mergeAuthorizations(state, authorizationsByEndpoint);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Pending);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(undefined);
  });

  it('invalidates the request if it is not authorized', () => {
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
    const authorizationsByEndpoint = { endpointId: { requesterAddress: false } };
    const res = authorization.mergeAuthorizations(state, authorizationsByEndpoint);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Errored);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.UnauthorizedClient);
  });
});
