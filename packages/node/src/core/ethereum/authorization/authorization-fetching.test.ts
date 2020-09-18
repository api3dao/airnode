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

describe('fetch (authorizations)', () => {
  let fetchOptions: any;

  beforeEach(() => {
    fetchOptions = {
      address: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
      provider: new ethers.providers.JsonRpcProvider(),
    };
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

    const [logs, err, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
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

    const [logs, err, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
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

    const [logs, err, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
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

    const apiCalls = [fixtures.requests.createApiCall()];

    const [logs, err, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
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

    const [logs, err, res] = await authorization.fetch(apiCalls, fetchOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch authorization details', error: new Error('Server says no') },
    ]);
    expect(err).toEqual(null);
    expect(res).toEqual({});
  });
});
