import * as authorization from './authorization-application';
import * as fixtures from '../../../test/fixtures';
import { RequestErrorMessage } from '../../types';

describe('mergeAuthorizations', () => {
  it('does nothing if the API call is already invalid', () => {
    const apiCall = fixtures.requests.buildApiCall({
      id: '0xapiCallId',
      errorMessage: RequestErrorMessage.RequestParameterDecodingFailed,
    });
    const authorizationByRequestId = { '0xapiCallId': true };
    const [logs, res] = authorization.mergeAuthorizations([apiCall], authorizationByRequestId);
    expect(logs).toEqual([]);
    expect(res).toEqual([apiCall]);
  });

  it('drops the request if it has no endpointId', () => {
    const apiCall = fixtures.requests.buildApiCall({ id: '0xapiCallId', endpointId: null });
    const authorizationByRequestId = { '0xapiCallId': true };
    const [logs, res] = authorization.mergeAuthorizations([apiCall], authorizationByRequestId);
    expect(logs).toEqual([{ level: 'ERROR', message: 'No endpoint ID found for Request ID:0xapiCallId' }]);
    expect(res.length).toEqual(0);
  });

  it('drops the request if no authorization is found', () => {
    const apiCall = fixtures.requests.buildApiCall({ id: '0xapiCallId' });
    const [logs, res] = authorization.mergeAuthorizations([apiCall], {});
    expect(logs).toEqual([{ level: 'WARN', message: 'Authorization not found for Request ID:0xapiCallId' }]);
    expect(res.length).toEqual(0);
  });

  it('returns the validated request if it is authorized', () => {
    const apiCall = fixtures.requests.buildApiCall({ id: '0xapiCallId' });
    const authorizationByRequestId = { '0xapiCallId': true };
    const [logs, res] = authorization.mergeAuthorizations([apiCall], authorizationByRequestId);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: 'Requester:requesterAddress is authorized to access Endpoint ID:endpointId for Request ID:0xapiCallId',
      },
    ]);
    expect(res).toEqual([apiCall]);
  });

  it('drops an unauthorized request', () => {
    const apiCall = fixtures.requests.buildApiCall({
      id: '0xapiCallId',
      requesterAddress: '0xrequesterAddress',
      endpointId: '0xendpointId',
    });
    const authorizationByRequestId = { '0xapiCallId': false };
    const [logs, res] = authorization.mergeAuthorizations([apiCall], authorizationByRequestId);
    expect(logs).toEqual([
      {
        level: 'WARN',
        message:
          'Requester:0xrequesterAddress is not authorized to access Endpoint ID:0xendpointId for Request ID:0xapiCallId',
      },
    ]);
    expect(res.length).toEqual(0);
  });
});
