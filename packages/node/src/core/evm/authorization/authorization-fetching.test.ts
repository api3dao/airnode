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
        clientAddress: `clientAddress-${n}`,
      });
    });

    const [logs, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(Object.keys(res).length).toEqual(19);
    expect(res['0']).toEqual(true);
    expect(res['18']).toEqual(true);

    expect(checkAuthorizationStatusesMock).toHaveBeenCalledTimes(2);

    const call1Args = [
      '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      apiCalls.slice(0, 10).map((a) => a.id),
      apiCalls.slice(0, 10).map((a) => a.endpointId),
      apiCalls.slice(0, 10).map((a) => a.requesterIndex),
      apiCalls.slice(0, 10).map((a) => a.designatedWallet),
      apiCalls.slice(0, 10).map((a) => a.clientAddress),
    ];
    const call2Args = [
      '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      apiCalls.slice(10, 19).map((a) => a.id),
      apiCalls.slice(10, 19).map((a) => a.endpointId),
      apiCalls.slice(10, 19).map((a) => a.requesterIndex),
      apiCalls.slice(10, 19).map((a) => a.designatedWallet),
      apiCalls.slice(10, 19).map((a) => a.clientAddress),
    ];
    expect(checkAuthorizationStatusesMock.mock.calls).toEqual([call1Args, call2Args]);
  });

  it('returns authorization statuses by request ID', async () => {
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true, false, true]);

    const apiCalls = [
      fixtures.requests.createApiCall({ id: '0xapiCallId-0' }),
      fixtures.requests.createApiCall({ id: '0xapiCallId-1' }),
      fixtures.requests.createApiCall({ id: '0xapiCallId-2' }),
    ];

    const [logs, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(res).toEqual({
      '0xapiCallId-0': true,
      '0xapiCallId-1': false,
      '0xapiCallId-2': true,
    });
  });

  it('retries once on failure', async () => {
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const apiCalls = [fixtures.requests.createApiCall({ id: '0xapiCallId' })];

    const [logs, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(res).toEqual({ '0xapiCallId': true });
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
