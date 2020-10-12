import * as fixtures from 'test/fixtures';
import { RequestErrorCode, RequestStatus, WalletDataByIndex } from 'src/types';
import * as authorization from './authorization-application';

describe('mergeAuthorizations', () => {
  it('does nothing if the API call is already invalid', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({
        endpointId: '0xendpointId',
        requesterAddress: '0xrequesterAddress',
        status: RequestStatus.Errored,
        errorCode: RequestErrorCode.InvalidRequestParameters,
      }),
    ];
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: apiCalls,
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };
    const authorizationsByEndpoint = { '0xendpointId': { '0xrequesterAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations(walletDataByIndex, authorizationsByEndpoint);
    expect(logs).toEqual([]);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Errored);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.InvalidRequestParameters);
  });

  it('does nothing if the API call is not pending', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({
        endpointId: '0xendpointId',
        requesterAddress: '0xrequesterAddress',
        status: RequestStatus.Blocked,
        errorCode: RequestErrorCode.TemplateNotFound,
      }),
    ];
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: apiCalls,
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };
    const authorizationsByEndpoint = { '0xendpointId': { '0xrequesterAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations(walletDataByIndex, authorizationsByEndpoint);
    expect(logs).toEqual([]);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
  });

  it('blocks the request if it has no endpointId', () => {
    const apiCalls = [fixtures.requests.createApiCall({ endpointId: null })];
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: apiCalls,
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };
    const authorizationsByEndpoint = { '0xendpointId': { '0xrequesterAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations(walletDataByIndex, authorizationsByEndpoint);
    expect(logs).toEqual([{ level: 'ERROR', message: 'No endpoint ID found for Request ID:apiCallId' }]);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.TemplateNotFound);
  });

  it('blocks the request if no authorization is found', () => {
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: [fixtures.requests.createApiCall()],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };
    const [logs, res] = authorization.mergeAuthorizations(walletDataByIndex, {});
    expect(logs).toEqual([{ level: 'WARN', message: 'Authorization not found for Request ID:apiCallId' }]);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.AuthorizationNotFound);
  });

  it('returns the validated request if it is authorized', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId: '0xendpointId', requesterAddress: '0xrequesterAddress' }),
    ];
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: apiCalls,
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };
    const authorizationsByEndpoint = { '0xendpointId': { '0xrequesterAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations(walletDataByIndex, authorizationsByEndpoint);
    expect(logs).toEqual([]);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Pending);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(undefined);
  });

  it('invalidates the request if it is not authorized', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId: '0xendpointId', requesterAddress: '0xrequesterAddress' }),
    ];
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: apiCalls,
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };
    const authorizationsByEndpoint = { '0xendpointId': { '0xrequesterAddress': false } };
    const [logs, res] = authorization.mergeAuthorizations(walletDataByIndex, authorizationsByEndpoint);
    expect(logs).toEqual([
      {
        level: 'WARN',
        message:
          'Client:0xrequesterAddress is not authorized to access Endpoint ID:0xendpointId for Request ID:apiCallId',
      },
    ]);
    expect(Object.keys(res).length).toEqual(1);
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Errored);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.UnauthorizedClient);
  });
});
