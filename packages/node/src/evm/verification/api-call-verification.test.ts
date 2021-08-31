import * as verification from './api-call-verification';
import * as fixtures from '../../../test/fixtures';
import * as requests from '../../requests';
import { RequestErrorCode, RequestStatus } from '../../types';

describe('verifyApiCallIds', () => {
  requests.getStatusNames().forEach((status) => {
    if (status !== 'Pending') {
      it(`returns API calls that have status: ${status}`, () => {
        const apiCall = fixtures.requests.buildApiCall({ status: RequestStatus[status as RequestStatus] });
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
    const apiCall = fixtures.requests.buildApiCall({
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0x12a4d7f900adf1a6e47f16fcfa67db7311294d3354224078ee43f81dd5394fb2',
      requestCount: '5',
      templateId: '0xe29a81893520cc4964bea1bc003e836e658c8043ba841fb7e5f7f91fe99fbb5b',
      type: 'regular',
    });
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });

  it('does nothing where full API calls have a valid request ID', () => {
    const apiCall = fixtures.requests.buildApiCall({
      airnodeAddress: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
      id: '0x6acbe45e5e9fbd490991b10c7393ffdb88653b02b98d6cad570adcee52e4b4b6',
      requestCount: '0',
      templateId: null,
      type: 'full',
    });
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });

  it('ignores regular API calls with invalid IDs', () => {
    const apiCall = fixtures.requests.buildApiCall({
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0xinvalid',
      requestCount: '5',
      templateId: '0xe29a81893520cc4964bea1bc003e836e658c8043ba841fb7e5f7f91fe99fbb5b',
      type: 'regular',
    });
    const expectedId = '0x12a4d7f900adf1a6e47f16fcfa67db7311294d3354224078ee43f81dd5394fb2';
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'ERROR', message: `Invalid ID for Request:${apiCall.id}. Expected:${expectedId}` }]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.RequestInvalid });
  });

  it('ignores full API calls with invalid IDs', () => {
    const apiCall = fixtures.requests.buildApiCall({
      airnodeAddress: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
      id: '0xinvalid',
      requestCount: '0',
      templateId: null,
      type: 'full',
    });
    const expectedId = '0x6acbe45e5e9fbd490991b10c7393ffdb88653b02b98d6cad570adcee52e4b4b6';
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'ERROR', message: `Invalid ID for Request:${apiCall.id}. Expected:${expectedId}` }]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.RequestInvalid });
  });
});
