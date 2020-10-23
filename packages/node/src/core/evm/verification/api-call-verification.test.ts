import * as fixtures from 'test/fixtures';
import * as requests from '../../requests';
import * as verification from './api-call-verification';
import { RequestErrorCode, RequestStatus } from 'src/types';

describe('REQUEST_ID_FIELDS', () => {
  it('returns the list of validated template fields', () => {
    expect(verification.REQUEST_ID_FIELDS).toEqual([
      { name: 'requestCount', type: 'uint256' },
      { name: 'templateId', type: 'bytes32' },
      { name: 'providerId', type: 'bytes32' },
      { name: 'endpointId', type: 'bytes32' },
      { name: 'encodedParameters', type: 'bytes' },
    ]);
  });
});

describe('verifyRequestId', () => {
  requests.getStatusNames().forEach((status) => {
    if (status !== 'Pending') {
      it(`returns API calls that have status: ${status}`, () => {
        const apiCall = fixtures.requests.createApiCall({ status: RequestStatus[status] });
        const [logs, res] = verification.verifyRequestId([apiCall]);
        expect(logs).toEqual([
          {
            level: 'DEBUG',
            message: `Request ID verification skipped for Request:${apiCall.id} as it has status:${apiCall.status}`,
          },
        ]);
        expect(res).toEqual([apiCall]);
      });
    }
  });

  it('does nothing where API calls have request ID', () => {
    const apiCall = fixtures.requests.createApiCall({
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: null,
      id: '0xf3a0b019f604865080f94155ef50099c601da17e092300b751b262294e2bf9b4',
      providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      templateId: '0x101c36202b92b358adda664515ea920f76b1edcf5f1285ab0c845f54638b45aa',
    });
    const [logs, res] = verification.verifyRequestId([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });
});
