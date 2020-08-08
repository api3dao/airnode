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

import * as fixtures from 'test/fixtures';
import { ProviderState, RequestErrorCode } from 'src/types';
import * as authorization from './authorization';
import * as providerState from '../../providers/state';

describe('fetch', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('calls the contract with groups of 10', async () => {
    const apiCalls = Array.from(Array(19).keys()).map((n) => {
      return fixtures.requests.createApiCall({
        id: `${n}`,
        endpointId: `endpointId-${n}`,
        requesterAddress: `requesterAddress-${n}`,
      });
    });

    checkAuthorizationStatusesMock.mockResolvedValueOnce(Array(10).fill(true));
    checkAuthorizationStatusesMock.mockResolvedValueOnce(Array(9).fill(true));

    const res = await authorization.fetch(state, apiCalls);
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
    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-0' }),
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-1' }),
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-2' }),
    ];

    checkAuthorizationStatusesMock.mockResolvedValueOnce([true, false, true]);

    const res = await authorization.fetch(state, apiCalls);
    expect(Object.keys(res).length).toEqual(1);
    expect(res['endpointId-0']).toEqual({
      'requester-0': true,
      'requester-1': false,
      'requester-2': true,
    });
  });

  it('removes duplicate endpointId and requester pairs', async () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-0' }),
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-0' }),
    ];

    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const res = await authorization.fetch(state, apiCalls);
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
    const apiCalls = [fixtures.requests.createApiCall()];

    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const res = await authorization.fetch(state, apiCalls);
    expect(res).toEqual({
      endpointId: {
        requesterAddress: true,
      },
    });
  });

  it('retries a maximum of two times', async () => {
    const apiCalls = [fixtures.requests.createApiCall()];

    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const res = await authorization.fetch(state, apiCalls);
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
    const apiCalls = [
      fixtures.requests.createApiCall({ valid: false, errorCode: RequestErrorCode.InvalidRequestParameters })
    ];
    const state = providerState.update(initialState, { requests: { ...initialState.requests, apiCalls } });

    const authorizationsByEndpoint = { endpointId: { requesterAddress: true } };
    const res = authorization.mergeAuthorizations(state, authorizationsByEndpoint);
    expect(res).toEqual({});
  });
});
