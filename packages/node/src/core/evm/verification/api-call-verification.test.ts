import * as fixtures from 'test/fixtures';
import * as requests from '../../requests';
import * as verification from './api-call-verification';
import { RequestErrorCode, RequestStatus } from 'src/types';

describe('verifyApiCallIds', () => {
  requests.getStatusNames().forEach((status) => {
    if (status !== 'Pending') {
      it(`returns API calls that have status: ${status}`, () => {
        const apiCall = fixtures.requests.createApiCall({ status: RequestStatus[status] });
        const [logs, res] = verification.verifyApiCallIds([apiCall]);
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

  it('does nothing where short API calls have a valid request ID', () => {
    const apiCall = fixtures.requests.createApiCall({
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: null,
      id: '0xf3a0b019f604865080f94155ef50099c601da17e092300b751b262294e2bf9b4',
      providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      requestCount: '0',
      templateId: '0x101c36202b92b358adda664515ea920f76b1edcf5f1285ab0c845f54638b45aa',
      type: 'short',
    });
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });

  it('does nothing where regular API calls have a valid request ID', () => {
    const apiCall = fixtures.requests.createApiCall({
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0xf3a0b019f604865080f94155ef50099c601da17e092300b751b262294e2bf9b4',
      requestCount: '0',
      templateId: '0x101c36202b92b358adda664515ea920f76b1edcf5f1285ab0c845f54638b45aa',
      type: 'regular',
    });
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });

  it('does nothing where full API calls have a valid request ID', () => {
    const apiCall = fixtures.requests.createApiCall({
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
      id: '0x681dd91d865d759081d5c68461f0ec4f89729ce9fd0fc0219e7029de9566c6d8',
      providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      requestCount: '0',
      templateId: null,
      type: 'full',
    });
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });

  it('ignores short API calls with invalid IDs', () => {
    const apiCall = fixtures.requests.createApiCall({
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: null,
      id: '0xinvalid',
      providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      requestCount: '0',
      templateId: '0x101c36202b92b358adda664515ea920f76b1edcf5f1285ab0c845f54638b45aa',
      type: 'short',
    });
    const expectedId = '0xf3a0b019f604865080f94155ef50099c601da17e092300b751b262294e2bf9b4';
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'ERROR', message: `Invalid ID for Request:${apiCall.id}. Expected:${expectedId}` }]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.RequestInvalid });
  });

  it('ignores regular API calls with invalid IDs', () => {
    const apiCall = fixtures.requests.createApiCall({
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0xinvalid',
      requestCount: '0',
      templateId: '0x101c36202b92b358adda664515ea920f76b1edcf5f1285ab0c845f54638b45aa',
      type: 'regular',
    });
    const expectedId = '0xf3a0b019f604865080f94155ef50099c601da17e092300b751b262294e2bf9b4';
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'ERROR', message: `Invalid ID for Request:${apiCall.id}. Expected:${expectedId}` }]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.RequestInvalid });
  });

  it('ignores full API calls with invalid IDs', () => {
    const apiCall = fixtures.requests.createApiCall({
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
      id: '0xinvalid',
      providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      requestCount: '0',
      templateId: null,
      type: 'full',
    });
    const expectedId = '0x681dd91d865d759081d5c68461f0ec4f89729ce9fd0fc0219e7029de9566c6d8';
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'ERROR', message: `Invalid ID for Request:${apiCall.id}. Expected:${expectedId}` }]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.RequestInvalid });
  });
});
