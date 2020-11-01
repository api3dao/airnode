import * as fixtures from 'test/fixtures';
import { RequestErrorCode, RequestStatus } from 'src/types';
import * as authorization from './authorization-application';

describe('mergeAuthorizations', () => {
  it('does nothing if the API call is already invalid', () => {
    const apiCall = fixtures.requests.createApiCall({
      endpointId: '0xendpointId',
      clientAddress: '0xclientAddress',
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.InvalidRequestParameters,
    });
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations([apiCall], authorizationsByEndpoint);
    expect(logs).toEqual([]);
    expect(res).toEqual([apiCall]);
  });

  it('does nothing if the API call is not pending', () => {
    const apiCall = fixtures.requests.createApiCall({
      endpointId: '0xendpointId',
      clientAddress: '0xclientAddress',
      status: RequestStatus.Blocked,
      errorCode: RequestErrorCode.TemplateNotFound,
    });
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations([apiCall], authorizationsByEndpoint);
    expect(logs).toEqual([]);
    expect(res).toEqual([apiCall]);
  });

  it('blocks the request if it has no endpointId', () => {
    const apiCall = fixtures.requests.createApiCall({ endpointId: null });
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations([apiCall], authorizationsByEndpoint);
    expect(logs).toEqual([{ level: 'ERROR', message: 'No endpoint ID found for Request ID:apiCallId' }]);
    expect(res).toEqual([{ ...apiCall, status: RequestStatus.Blocked, errorCode: RequestErrorCode.TemplateNotFound }]);
  });

  it('blocks the request if no authorization is found', () => {
    const apiCall = fixtures.requests.createApiCall();
    const [logs, res] = authorization.mergeAuthorizations([apiCall], {});
    expect(logs).toEqual([{ level: 'WARN', message: 'Authorization not found for Request ID:apiCallId' }]);
    expect(res).toEqual([
      { ...apiCall, status: RequestStatus.Blocked, errorCode: RequestErrorCode.AuthorizationNotFound },
    ]);
  });

  it('returns the validated request if it is authorized', () => {
    const apiCall = fixtures.requests.createApiCall({ endpointId: '0xendpointId', clientAddress: '0xclientAddress' });
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': true } };
    const [logs, res] = authorization.mergeAuthorizations([apiCall], authorizationsByEndpoint);
    expect(logs).toEqual([]);
    expect(res).toEqual([apiCall]);
  });

  it('invalidates the request if it is not authorized', () => {
    const apiCall = fixtures.requests.createApiCall({ endpointId: '0xendpointId', clientAddress: '0xclientAddress' });
    const authorizationsByEndpoint = { '0xendpointId': { '0xclientAddress': false } };
    const [logs, res] = authorization.mergeAuthorizations([apiCall], authorizationsByEndpoint);
    expect(logs).toEqual([
      {
        level: 'WARN',
        message: 'Client:0xclientAddress is not authorized to access Endpoint ID:0xendpointId for Request ID:apiCallId',
      },
    ]);
    expect(res).toEqual([
      { ...apiCall, status: RequestStatus.Errored, errorCode: RequestErrorCode.UnauthorizedClient },
    ]);
  });
});
