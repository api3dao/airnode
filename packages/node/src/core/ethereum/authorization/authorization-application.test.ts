import * as fixtures from 'test/fixtures';
import { ProviderState, RequestErrorCode, RequestStatus } from 'src/types';
import * as authorization from './authorization-application';
import * as providerState from '../../providers/state';

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

  it('does nothing if the API call is not pending', () => {
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ status: RequestStatus.Blocked })],
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
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.AuthorizationNotFound);
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
