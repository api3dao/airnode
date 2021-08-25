import { mockEthers } from '../../../test/mock-utils';
const checkAuthorizationStatusMock = jest.fn();
const checkAuthorizationStatusesMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    checkAuthorizationStatus: checkAuthorizationStatusMock,
    checkAuthorizationStatuses: checkAuthorizationStatusesMock,
  },
});

import { ethers } from 'ethers';
import * as authorization from './authorization-fetching';
import * as fixtures from '../../../test/fixtures';
import { RequestStatus } from '../../types';
import { AirnodeRrp } from '../contracts';

describe('fetch (authorizations)', () => {
  let mutableFetchOptions: authorization.FetchOptions;

  beforeEach(() => {
    mutableFetchOptions = {
      authorizers: ['0x0000000000000000000000000000000000000000'],
      airnodeAddress: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      airnodeRrpAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
      provider: new ethers.providers.JsonRpcProvider(),
    };
  });

  it('returns an empty object if there are no pending API calls', async () => {
    const apiCalls = [fixtures.requests.buildApiCall({ status: RequestStatus.Blocked })];
    const [logs, res] = await authorization.fetch(apiCalls, mutableFetchOptions);
    expect(logs).toEqual([]);
    expect(res).toEqual({});
  });

  it('calls the contract with groups of 10', async () => {
    checkAuthorizationStatusesMock.mockResolvedValueOnce(Array(10).fill(true));
    checkAuthorizationStatusesMock.mockResolvedValueOnce(Array(9).fill(true));

    const apiCalls = Array.from(Array(19).keys()).map((n) => {
      return fixtures.requests.buildApiCall({
        id: `${n}`,
        endpointId: `endpointId-${n}`,
        clientAddress: `clientAddress-${n}`,
      });
    });

    const [logs, res] = await authorization.fetch(apiCalls, mutableFetchOptions);
    expect(logs).toEqual([]);
    expect(Object.keys(res).length).toEqual(19);
    expect(res['0']).toEqual(true);
    expect(res['18']).toEqual(true);

    expect(checkAuthorizationStatusesMock).toHaveBeenCalledTimes(2);

    const call1Args = [
      '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      apiCalls.slice(0, 10).map((a) => a.id),
      apiCalls.slice(0, 10).map((a) => a.endpointId),
      apiCalls.slice(0, 10).map((a) => a.sponsorAddress),
      apiCalls.slice(0, 10).map((a) => a.sponsorWallet),
      apiCalls.slice(0, 10).map((a) => a.clientAddress),
    ];
    const call2Args = [
      '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      apiCalls.slice(10, 19).map((a) => a.id),
      apiCalls.slice(10, 19).map((a) => a.endpointId),
      apiCalls.slice(10, 19).map((a) => a.sponsorAddress),
      apiCalls.slice(10, 19).map((a) => a.sponsorWallet),
      apiCalls.slice(10, 19).map((a) => a.clientAddress),
    ];
    expect(checkAuthorizationStatusesMock.mock.calls).toEqual([call1Args, call2Args]);
  });

  it('returns authorization statuses by request ID', async () => {
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true, false, true]);

    const apiCalls = [
      fixtures.requests.buildApiCall({ id: '0xapiCallId-0' }),
      fixtures.requests.buildApiCall({ id: '0xapiCallId-1' }),
      fixtures.requests.buildApiCall({ id: '0xapiCallId-2' }),
    ];

    const [logs, res] = await authorization.fetch(apiCalls, mutableFetchOptions);
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
    const apiCalls = [fixtures.requests.buildApiCall({ id: '0xapiCallId' })];
    const [logs, res] = await authorization.fetch(apiCalls, mutableFetchOptions);
    expect(logs).toEqual([]);
    expect(res).toEqual({ '0xapiCallId': true });
  });

  it('fetches individual authorization statuses if the group cannot be fetched', async () => {
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));

    checkAuthorizationStatusMock.mockResolvedValueOnce(true);

    const apiCall = fixtures.requests.buildApiCall();
    const [logs, res] = await authorization.fetch([apiCall], mutableFetchOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch group authorization details', error: new Error('Server says no') },
      { level: 'INFO', message: `Fetched authorization status for Request:${apiCall.id}` },
    ]);
    expect(res).toEqual({ [apiCall.id]: true });
  });

  it('retries individual authorization calls once', async () => {
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));

    checkAuthorizationStatusMock.mockRejectedValueOnce(new Error('Server still says no'));
    checkAuthorizationStatusMock.mockResolvedValueOnce(false);

    const apiCall = fixtures.requests.buildApiCall();
    const [logs, res] = await authorization.fetch([apiCall], mutableFetchOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch group authorization details', error: new Error('Server says no') },
      { level: 'INFO', message: `Fetched authorization status for Request:${apiCall.id}` },
    ]);
    expect(res).toEqual({ [apiCall.id]: false });
  });

  it('returns nothing after all individual authorization calls are exhausted', async () => {
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));
    checkAuthorizationStatusesMock.mockRejectedValueOnce(new Error('Server says no'));

    checkAuthorizationStatusMock.mockRejectedValueOnce(new Error('Server still says no'));
    checkAuthorizationStatusMock.mockRejectedValueOnce(new Error('Server still says no'));

    const apiCall = fixtures.requests.buildApiCall();
    const [logs, res] = await authorization.fetch([apiCall], mutableFetchOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch group authorization details', error: new Error('Server says no') },
      {
        level: 'ERROR',
        message: `Failed to fetch authorization details for Request:${apiCall.id}`,
        error: new Error('Server still says no'),
      },
    ]);
    expect(res).toEqual({});
  });
});

describe('fetchAuthorizationStatus', () => {
  const authorizers = ['0x0000000000000000000000000000000000000000'];
  const airnodeAddress = '0xairnodeAddress';
  let mutableAirnodeRrp: AirnodeRrp;

  beforeEach(() => {
    mutableAirnodeRrp = new ethers.Contract('address', ['ABI']) as any as AirnodeRrp;
  });

  it('fetches group authorization status if it can be fetched', async () => {
    checkAuthorizationStatusMock.mockResolvedValueOnce(true);
    const apiCall = fixtures.requests.buildApiCall();
    const [logs, res] = await authorization.fetchAuthorizationStatus(
      mutableAirnodeRrp,
      authorizers,
      airnodeAddress,
      apiCall
    );
    expect(logs).toEqual([{ level: 'INFO', message: `Fetched authorization status for Request:${apiCall.id}` }]);
    expect(res).toEqual(true);
  });

  it('retries individual authorization calls once', async () => {
    checkAuthorizationStatusMock.mockRejectedValueOnce(new Error('Server still says no'));
    checkAuthorizationStatusMock.mockResolvedValueOnce(false);
    const apiCall = fixtures.requests.buildApiCall();
    const [logs, res] = await authorization.fetchAuthorizationStatus(
      mutableAirnodeRrp,
      authorizers,
      airnodeAddress,
      apiCall
    );
    expect(logs).toEqual([{ level: 'INFO', message: `Fetched authorization status for Request:${apiCall.id}` }]);
    expect(res).toEqual(false);
  });

  it('returns nothing after all individual authorization calls are exhausted', async () => {
    checkAuthorizationStatusMock.mockRejectedValueOnce(new Error('Server still says no'));
    checkAuthorizationStatusMock.mockRejectedValueOnce(new Error('Server still says no'));
    const apiCall = fixtures.requests.buildApiCall();
    const [logs, res] = await authorization.fetchAuthorizationStatus(
      mutableAirnodeRrp,
      authorizers,
      airnodeAddress,
      apiCall
    );
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Failed to fetch authorization details for Request:${apiCall.id}`,
        error: new Error('Server still says no'),
      },
    ]);
    expect(res).toEqual(null);
  });
});
