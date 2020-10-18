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

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import * as authorization from './authorization-fetching';
import { RequestStatus } from 'src/types';

describe('fetch (authorizations)', () => {
  let fetchOptions: any;

  beforeEach(() => {
    fetchOptions = {
      address: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
      provider: new ethers.providers.JsonRpcProvider(),
      providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
    };
  });

  it('returns an empty object if there are no pending API calls', async () => {
    const apiCalls = [fixtures.requests.createApiCall({ status: RequestStatus.Blocked })];
    const [logs, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(res).toEqual({});
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

    const [logs, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(Object.keys(res).length).toEqual(19);
    expect(res['endpointId-0']).toEqual({ 'requesterAddress-0': true });
    expect(res['endpointId-18']).toEqual({ 'requesterAddress-18': true });

    expect(checkAuthorizationStatusesMock).toHaveBeenCalledTimes(2);

    const call1Args = [
      '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      apiCalls.slice(0, 10).map((a) => a.id),
      apiCalls.slice(0, 10).map((a) => a.endpointId),
      apiCalls.slice(0, 10).map((a) => a.requesterIndex),
      apiCalls.slice(0, 10).map((a) => a.designatedWallet),
      apiCalls.slice(0, 10).map((a) => a.requesterAddress),
    ];
    const call2Args = [
      '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      apiCalls.slice(10, 19).map((a) => a.id),
      apiCalls.slice(10, 19).map((a) => a.endpointId),
      apiCalls.slice(10, 19).map((a) => a.requesterIndex),
      apiCalls.slice(10, 19).map((a) => a.designatedWallet),
      apiCalls.slice(10, 19).map((a) => a.requesterAddress),
    ];
    expect(checkAuthorizationStatusesMock.mock.calls).toEqual([call1Args, call2Args]);
  });

  it('groups by endpoint ID', async () => {
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true, false, true]);

    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-0' }),
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-1' }),
      fixtures.requests.createApiCall({ endpointId: 'endpointId-0', requesterAddress: 'requester-2' }),
    ];

    const [logs, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
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

    const [logs, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(Object.keys(res).length).toEqual(1);
    expect(res).toEqual({
      'endpointId-0': {
        'requester-0': true,
      },
    });

    expect(checkAuthorizationStatusesMock).toHaveBeenCalledTimes(1);
    const callArgs = [
      '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      [apiCalls[0].id],
      [apiCalls[0].endpointId],
      [apiCalls[0].requesterIndex],
      [apiCalls[0].designatedWallet],
      [apiCalls[0].requesterAddress],
    ];
    expect(checkAuthorizationStatusesMock.mock.calls).toEqual([callArgs]);
  });

  it('retries once on failure', async () => {
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const apiCalls = [fixtures.requests.createApiCall()];

    const [logs, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
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

    const apiCalls = [fixtures.requests.createApiCall()];

    const [logs, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch authorization details', error: new Error('Server says no') },
    ]);
    expect(res).toEqual({});
  });
});
