import * as verification from './api-call-verification';
import * as fixtures from '../../../test/fixtures';
import * as requests from '../../requests';
import { RequestErrorMessage, RequestStatus } from '../../types';

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

  it('does nothing where template API calls have a valid request ID', () => {
    const apiCall = fixtures.requests.buildApiCall({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      sponsorWalletAddress: '0xd5e6a768f1d23d30B386Bb5c125DBe83A9c40c73',
      fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      fulfillFunctionId: '0x7c1de7e1',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0x67caaa2862cf971502d5c5b3d94d09d15c770f3313e76aa95c296b6587e7e5f1',
      requestCount: '5',
      templateId: '0xe29a81893520cc4964bea1bc003e836e658c8043ba841fb7e5f7f91fe99fbb5b',
      type: 'template',
    });
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });

  it('does nothing where full API calls have a valid request ID', () => {
    const apiCall = fixtures.requests.buildApiCall({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      sponsorWalletAddress: '0xd5e6a768f1d23d30B386Bb5c125DBe83A9c40c73',
      fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      fulfillFunctionId: '0x7c1de7e1',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
      id: '0x37b3b5fd437d12e3b6ed6e70f6564d521ffe93f138bd47436b4a53929cee7fbe',
      requestCount: '0',
      templateId: null,
      type: 'full',
    });
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request ID:${apiCall.id} has a valid ID` }]);
    expect(res[0]).toEqual(apiCall);
  });

  it('ignores template API calls with invalid IDs', () => {
    const apiCall = fixtures.requests.buildApiCall({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      sponsorWalletAddress: '0xd5e6a768f1d23d30B386Bb5c125DBe83A9c40c73',
      fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      fulfillFunctionId: '0x7c1de7e1',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      id: '0xinvalid',
      requestCount: '5',
      templateId: '0xe29a81893520cc4964bea1bc003e836e658c8043ba841fb7e5f7f91fe99fbb5b',
      type: 'template',
    });
    const expectedId = '0x67caaa2862cf971502d5c5b3d94d09d15c770f3313e76aa95c296b6587e7e5f1';
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'ERROR', message: `Invalid ID for Request:${apiCall.id}. Expected:${expectedId}` }]);
    expect(res[0]).toEqual({
      ...apiCall,
      status: RequestStatus.Ignored,
      errorMessage: `${RequestErrorMessage.RequestIdInvalid}: ${apiCall.id}`,
    });
  });

  it('ignores full API calls with invalid IDs', () => {
    const apiCall = fixtures.requests.buildApiCall({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      chainId: '31337',
      requesterAddress: '0x7f7d1Aa0792aC39f43C6e7FA2ec31258Fc5FD612',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      sponsorWalletAddress: '0xd5e6a768f1d23d30B386Bb5c125DBe83A9c40c73',
      fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      fulfillFunctionId: '0x7c1de7e1',
      encodedParameters: '0x62746f6355534466616d6f756e746131',
      endpointId: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
      id: '0xinvalid',
      requestCount: '0',
      templateId: null,
      type: 'full',
    });
    const expectedId = '0x37b3b5fd437d12e3b6ed6e70f6564d521ffe93f138bd47436b4a53929cee7fbe';
    const [logs, res] = verification.verifyApiCallIds([apiCall]);
    expect(logs).toEqual([{ level: 'ERROR', message: `Invalid ID for Request:${apiCall.id}. Expected:${expectedId}` }]);
    expect(res[0]).toEqual({
      ...apiCall,
      status: RequestStatus.Ignored,
      errorMessage: `${RequestErrorMessage.RequestIdInvalid}: ${apiCall.id}`,
    });
  });
});
