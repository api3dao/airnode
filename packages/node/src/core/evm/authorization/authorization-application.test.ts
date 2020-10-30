import * as fixtures from 'test/fixtures';
import { RequestErrorCode, RequestStatus } from 'src/types';
import * as authorization from './authorization-application';

describe('mergeAuthorizations', () => {
  it('does nothing if the API call is already invalid', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({
        endpointId: '0xendpointId',
        clientAddress: '0xclientAddress',
        status: RequestStatus.Errored,
        errorCode: RequestErrorCode.InvalidRequestParameters,
      }),
    ];
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations(apiCalls, authorizationsByEndpoint);
    expect(logs).toEqual([]);
    expect(res).toEqual(1);
    expect(res[0].status).toEqual(RequestStatus.Errored);
    expect(res[0].errorCode).toEqual(RequestErrorCode.InvalidRequestParameters);
  });

  it('does nothing if the API call is not pending', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({
        endpointId: '0xendpointId',
        clientAddress: '0xclientAddress',
        status: RequestStatus.Blocked,
        errorCode: RequestErrorCode.TemplateNotFound,
      }),
    ];
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations(apiCalls, authorizationsByEndpoint);
    expect(logs).toEqual([]);
    expect(res.length).toEqual(1);
    expect(res[0].status).toEqual(RequestStatus.Blocked);
  });

  it('blocks the request if it has no endpointId', () => {
    const apiCalls = [fixtures.requests.createApiCall({ endpointId: null })];
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations(apiCalls, authorizationsByEndpoint);
    expect(logs).toEqual([{ level: 'ERROR', message: 'No endpoint ID found for Request ID:apiCallId' }]);
    expect(res.length).toEqual(1);
    expect(res[0].status).toEqual(RequestStatus.Blocked);
    expect(res[0].errorCode).toEqual(RequestErrorCode.TemplateNotFound);
  });

  it('blocks the request if no authorization is found', () => {
    const apiCalls = [fixtures.requests.createApiCall()];
    const [logs, res] = authorization.mergeAuthorizations(apiCalls, {});
    expect(logs).toEqual([{ level: 'WARN', message: 'Authorization not found for Request ID:apiCallId' }]);
    expect(res.length).toEqual(1);
    expect(res[0].status).toEqual(RequestStatus.Blocked);
    expect(res[0].errorCode).toEqual(RequestErrorCode.AuthorizationNotFound);
  });

  it('returns the validated request if it is authorized', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId: '0xendpointId', clientAddress: '0xclientAddress' }),
    ];
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations(apiCalls, authorizationsByEndpoint);
    expect(logs).toEqual([]);
    expect(res.length).toEqual(1);
    expect(res[0].status).toEqual(RequestStatus.Pending);
    expect(res[0].errorCode).toEqual(undefined);
  });

  it('invalidates the request if it is not authorized', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId: '0xendpointId', clientAddress: '0xclientAddress' }),
    ];
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': false } };
    const [logs, res] = authorization.mergeAuthorizations(apiCalls, authorizationsByEndpoint);
    expect(logs).toEqual([
      {
        level: 'WARN',
        message: 'Client:0xclientAddress is not authorized to access Endpoint ID:0xendpointId for Request ID:apiCallId',
      },
    ]);
    expect(res.length).toEqual(1);
    expect(res[0].status).toEqual(RequestStatus.Errored);
    expect(res[0].errorCode).toEqual(RequestErrorCode.UnauthorizedClient);
  });
});
