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

  it('does nothing where regular API calls have a valid request ID', () => {
    const apiCall = fixtures.requests.createApiCall({
      clientAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0x564ea6249a5ade738e037320153a7052043f5268afcc5340f9d2b8f4cc29ccc1',
      requestCount: '0',
      templateId: '0xe29a81893520cc4964bea1bc003e836e658c8043ba841fb7e5f7f91fe99fbb5b',
      type: 'regular',
    });
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });

  it('does nothing where full API calls have a valid request ID', () => {
    const apiCall = fixtures.requests.createApiCall({
      clientAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
      id: '0xf872062fc4ca8f4aa5ee49232a875001818be9614a0d57b065e3e0f07ed021b1',
      providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      requestCount: '0',
      templateId: null,
      type: 'full',
    });
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });

  it('ignores regular API calls with invalid IDs', () => {
    const apiCall = fixtures.requests.createApiCall({
      clientAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0xinvalid',
      requestCount: '0',
      templateId: '0xe29a81893520cc4964bea1bc003e836e658c8043ba841fb7e5f7f91fe99fbb5b',
      type: 'regular',
    });
    const expectedId = '0x564ea6249a5ade738e037320153a7052043f5268afcc5340f9d2b8f4cc29ccc1';
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'ERROR', message: `Invalid ID for Request:${apiCall.id}. Expected:${expectedId}` }]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.RequestInvalid });
  });

  it('ignores full API calls with invalid IDs', () => {
    const apiCall = fixtures.requests.createApiCall({
      clientAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
      id: '0xinvalid',
      providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      requestCount: '0',
      templateId: null,
      type: 'full',
    });
    const expectedId = '0xf872062fc4ca8f4aa5ee49232a875001818be9614a0d57b065e3e0f07ed021b1';
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'ERROR', message: `Invalid ID for Request:${apiCall.id}. Expected:${expectedId}` }]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.RequestInvalid });
  });
});
