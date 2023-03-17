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
import { RequesterAuthorizerWithErc721Factory } from '@api3/airnode-protocol';
import * as authorization from './authorization-fetching';
import * as fixtures from '../../../test/fixtures';
import { AirnodeRrpV0 } from '../contracts';
import { ApiCall, Request } from '../../../src/types';

describe('fetch (authorizations)', () => {
  let mutableFetchOptions: authorization.AirnodeRrpFetchOptions;

  beforeEach(() => {
    mutableFetchOptions = {
      type: 'airnodeRrp',
      requesterEndpointAuthorizers: [
        '0x711c93B32c0D28a5d18feD87434cce11C3e5699B',
        '0x9E0e23766b0ed0C492804872c5164E9187fB56f5',
      ],
      authorizations: {
        requesterEndpointAuthorizations: {},
      },
      airnodeAddress: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      airnodeRrpAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
      provider: new ethers.providers.JsonRpcProvider(),
    };
  });

  it('returns an empty object if there are no pending API calls', async () => {
    const apiCalls: Request<ApiCall>[] = [];
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
        requesterAddress: `requesterAddress-${n}`,
        sponsorAddress: 'sponsorAddress',
      });
    });

    const [logs, res] = await authorization.fetch(apiCalls, mutableFetchOptions);
    expect(logs).toEqual([]);
    expect(Object.keys(res).length).toEqual(19);
    expect(res['0']).toEqual(true);
    expect(res['18']).toEqual(true);

    expect(checkAuthorizationStatusesMock).toHaveBeenCalledTimes(2);

    const call1Args = [
      ['0x711c93B32c0D28a5d18feD87434cce11C3e5699B', '0x9E0e23766b0ed0C492804872c5164E9187fB56f5'],
      '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      apiCalls.slice(0, 10).map((a) => a.id),
      apiCalls.slice(0, 10).map((a) => a.endpointId),
      apiCalls.slice(0, 10).map((a) => a.sponsorAddress),
      apiCalls.slice(0, 10).map((a) => a.requesterAddress),
    ];
    const call2Args = [
      ['0x711c93B32c0D28a5d18feD87434cce11C3e5699B', '0x9E0e23766b0ed0C492804872c5164E9187fB56f5'],
      '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      apiCalls.slice(10, 19).map((a) => a.id),
      apiCalls.slice(10, 19).map((a) => a.endpointId),
      apiCalls.slice(10, 19).map((a) => a.sponsorAddress),
      apiCalls.slice(10, 19).map((a) => a.requesterAddress),
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
      {
        level: 'WARN',
        message:
          'Failed to fetch requesterEndpointAuthorizers authorization using checkAuthorizationStatuses. ' +
          'Falling back to fetching authorizations individually.',
        error: new Error('Server says no'),
      },
      {
        level: 'INFO',
        message: `Fetched requesterEndpointAuthorizers authorization using checkAuthorizationStatus for Request:${apiCall.id}`,
      },
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
      {
        level: 'WARN',
        message:
          'Failed to fetch requesterEndpointAuthorizers authorization using checkAuthorizationStatuses. ' +
          'Falling back to fetching authorizations individually.',
        error: new Error('Server says no'),
      },
      {
        level: 'INFO',
        message: `Fetched requesterEndpointAuthorizers authorization using checkAuthorizationStatus for Request:${apiCall.id}`,
      },
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
      {
        level: 'WARN',
        message:
          'Failed to fetch requesterEndpointAuthorizers authorization using checkAuthorizationStatuses. ' +
          'Falling back to fetching authorizations individually.',
        error: new Error('Server says no'),
      },
      {
        level: 'ERROR',
        message: `Failed to fetch requesterEndpointAuthorizers authorization using checkAuthorizationStatus for Request:${apiCall.id}`,
        error: new Error('Server still says no'),
      },
    ]);
    expect(res).toEqual({});
  });

  it('does not fetch authorizations if found in config and returns true for valid authorizations', async () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({
        id: '0xapiCallId-0',
        requesterAddress: '0xrequester-0',
        endpointId: '0xendpointId-0',
      }),
      fixtures.requests.buildApiCall({
        id: '0xapiCallId-1',
        requesterAddress: '0xrequester-1',
        endpointId: '0xendpointId-0',
      }),
      fixtures.requests.buildApiCall({
        id: '0xapiCallId-2',
        requesterAddress: '0xrequester-2',
        endpointId: '0xendpointId-2',
      }),
    ];

    const [logs, res] = await authorization.fetch(apiCalls, {
      ...mutableFetchOptions,
      authorizations: {
        requesterEndpointAuthorizations: {
          '0xendpointId-0': ['0xrequester-0', '0xrequester-1'],
          '0xendpointId-2': ['0xrequester-2'],
        },
      },
    });

    expect(checkAuthorizationStatusesMock).not.toHaveBeenCalled();
    expect(checkAuthorizationStatusMock).not.toHaveBeenCalled();
    expect(logs).toEqual([]);
    expect(res).toEqual({
      '0xapiCallId-0': true,
      '0xapiCallId-1': true,
      '0xapiCallId-2': true,
    });
  });

  it('handles a combination of both config and on-chain authorizations correctly', async () => {
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true, false]);
    const apiCalls = [
      // Config authorization
      fixtures.requests.buildApiCall({
        id: '0xapiCallId-0',
        airnodeAddress: mutableFetchOptions.airnodeAddress,
        requesterAddress: '0xrequester-0',
        sponsorAddress: '0xsponsor-0',
        endpointId: '0xendpointId-0',
      }),
      // On-chain success authorization
      fixtures.requests.buildApiCall({
        id: '0xapiCallId-1',
        airnodeAddress: mutableFetchOptions.airnodeAddress,
        requesterAddress: '0xrequester-1',
        sponsorAddress: '0xsponsor-1',
        endpointId: '0xendpointId-1',
      }),
      // On-chain failed authorization
      fixtures.requests.buildApiCall({
        id: '0xapiCallId-2',
        airnodeAddress: mutableFetchOptions.airnodeAddress,
        requesterAddress: '0xrequester-2',
        sponsorAddress: '0xsponsor-2',
        endpointId: '0xendpointId-2',
      }),
    ];

    const [logs, res] = await authorization.fetch(apiCalls, {
      ...mutableFetchOptions,
      authorizations: {
        requesterEndpointAuthorizations: {
          '0xendpointId-0': ['0xrequester-0'],
        },
      },
    });

    expect(checkAuthorizationStatusesMock).toHaveBeenCalledWith(
      mutableFetchOptions.requesterEndpointAuthorizers,
      apiCalls[1].airnodeAddress,
      [apiCalls[1].id, apiCalls[2].id],
      [apiCalls[1].endpointId, apiCalls[2].endpointId],
      [apiCalls[1].sponsorAddress, apiCalls[2].sponsorAddress],
      [apiCalls[1].requesterAddress, apiCalls[2].requesterAddress]
    );
    expect(checkAuthorizationStatusesMock).not.toHaveBeenCalledWith(
      mutableFetchOptions.requesterEndpointAuthorizers,
      apiCalls[0].airnodeAddress,
      [apiCalls[0].id],
      [apiCalls[0].endpointId],
      [apiCalls[0].sponsorAddress],
      [apiCalls[0].requesterAddress]
    );
    expect(logs).toEqual([]);
    expect(res).toEqual({
      '0xapiCallId-0': true,
      '0xapiCallId-1': true,
      '0xapiCallId-2': false,
    });
  });

  it('fetches authorizations if the requester address is not included in config authorizations', async () => {
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);
    const apiCalls = [
      fixtures.requests.buildApiCall({
        id: '0xapiCallId-0',
        airnodeAddress: mutableFetchOptions.airnodeAddress,
        requesterAddress: '0xrequester-0',
        sponsorAddress: '0xsponsor-0',
        endpointId: '0xendpointId-0',
      }),
    ];

    const [logs, res] = await authorization.fetch(apiCalls, {
      ...mutableFetchOptions,
      authorizations: {
        requesterEndpointAuthorizations: {
          '0xendpointId-0': ['0xrequester-1'],
        },
      },
    });

    expect(checkAuthorizationStatusesMock).toHaveBeenNthCalledWith(
      1,
      mutableFetchOptions.requesterEndpointAuthorizers,
      apiCalls[0].airnodeAddress,
      [apiCalls[0].id],
      [apiCalls[0].endpointId],
      [apiCalls[0].sponsorAddress],
      [apiCalls[0].requesterAddress]
    );
    expect(logs).toEqual([]);
    expect(res).toEqual({
      '0xapiCallId-0': true,
    });
  });
});

describe('fetchAuthorizationStatus', () => {
  const requesterEndpointAuthorizers = ['0x0000000000000000000000000000000000000000'];
  const airnodeAddress = '0xairnodeAddress';
  let mutableAirnodeRrp: AirnodeRrpV0;

  beforeEach(() => {
    mutableAirnodeRrp = new ethers.Contract('address', ['ABI']) as any as AirnodeRrpV0;
  });

  it('fetches group authorization status if it can be fetched', async () => {
    checkAuthorizationStatusMock.mockResolvedValueOnce(true);
    const apiCall = fixtures.requests.buildApiCall();
    const [logs, res] = await authorization.fetchAuthorizationStatus(
      mutableAirnodeRrp,
      requesterEndpointAuthorizers,
      airnodeAddress,
      apiCall
    );
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: `Fetched requesterEndpointAuthorizers authorization using checkAuthorizationStatus for Request:${apiCall.id}`,
      },
    ]);
    expect(res).toEqual(true);
  });

  it('retries individual authorization calls once', async () => {
    checkAuthorizationStatusMock.mockRejectedValueOnce(new Error('Server still says no'));
    checkAuthorizationStatusMock.mockResolvedValueOnce(false);
    const apiCall = fixtures.requests.buildApiCall();
    const [logs, res] = await authorization.fetchAuthorizationStatus(
      mutableAirnodeRrp,
      requesterEndpointAuthorizers,
      airnodeAddress,
      apiCall
    );
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: `Fetched requesterEndpointAuthorizers authorization using checkAuthorizationStatus for Request:${apiCall.id}`,
      },
    ]);
    expect(res).toEqual(false);
  });

  it('returns nothing after all individual authorization calls are exhausted', async () => {
    checkAuthorizationStatusMock.mockRejectedValueOnce(new Error('Server still says no'));
    checkAuthorizationStatusMock.mockRejectedValueOnce(new Error('Server still says no'));
    const apiCall = fixtures.requests.buildApiCall();
    const [logs, res] = await authorization.fetchAuthorizationStatus(
      mutableAirnodeRrp,
      requesterEndpointAuthorizers,
      airnodeAddress,
      apiCall
    );
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Failed to fetch requesterEndpointAuthorizers authorization using checkAuthorizationStatus for Request:${apiCall.id}`,
        error: new Error('Server still says no'),
      },
    ]);
    expect(res).toEqual(null);
  });
});

describe('decodeMulticall', () => {
  it('decodes the results of a multicall', () => {
    const requesterAuthorizerWithErc721 = RequesterAuthorizerWithErc721Factory.connect(
      '0x0',
      new ethers.providers.JsonRpcProvider()
    );
    const data = [
      ethers.utils.defaultAbiCoder.encode(['bool'], [true]),
      ethers.utils.defaultAbiCoder.encode(['bool'], [false]),
    ];
    expect(authorization.decodeMulticall(requesterAuthorizerWithErc721, data)).toEqual([true, false]);
  });
});

describe('applyErc721Authorizations', () => {
  it('returns authorization statuses in the same order that they were requested', () => {
    const apiCalls: Request<ApiCall>[] = [
      fixtures.requests.buildApiCall({ id: '0x1' }),
      fixtures.requests.buildApiCall({ id: '0x2' }),
      fixtures.requests.buildApiCall({ id: '0x3' }),
      fixtures.requests.buildApiCall({ id: '0x4' }),
    ];
    const erc721s = ['0x1', '0x2'];
    const results = [true, true, true, false, false, true, false, false];
    // The requester is authorized if authorized by any Erc721
    const expected = {
      '0x1': true,
      '0x2': true,
      '0x3': true,
      '0x4': false,
    };
    expect(authorization.applyErc721Authorizations(apiCalls, erc721s, results)).toEqual(expected);
  });
});
