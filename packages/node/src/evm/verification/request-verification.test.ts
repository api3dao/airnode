import * as fixtures from 'test/fixtures';
import * as requests from '../../requests';
import * as verification from './request-verification';
import * as wallet from '../wallet';
import { RequestErrorCode, RequestStatus } from 'src/types';

describe('verifyDesignatedWallets', () => {
  const masterHDNode = wallet.getMasterHDNode();

  requests.getStatusNames().forEach((status) => {
    if (status !== 'Pending') {
      it(`returns API calls that have status: ${status}`, () => {
        const apiCall = fixtures.requests.buildApiCall({
          designatedWallet: '0xinvalid',
          status: RequestStatus[status],
        });
        const [logs, res] = verification.verifyDesignatedWallets([apiCall], masterHDNode);
        expect(logs).toEqual([
          {
            level: 'DEBUG',
            message: `Designated wallet verification skipped for Request:${apiCall.id} as it has status:${apiCall.status}`,
          },
        ]);
        expect(res).toEqual([apiCall]);
      });

      it(`returns withdrawals that have status: ${status}`, () => {
        const withdrawal = fixtures.requests.createWithdrawal({
          designatedWallet: '0xinvalid',
          status: RequestStatus[status],
        });
        const [logs, res] = verification.verifyDesignatedWallets([withdrawal], masterHDNode);
        expect(logs).toEqual([
          {
            level: 'DEBUG',
            message: `Designated wallet verification skipped for Request:${withdrawal.id} as it has status:${withdrawal.status}`,
          },
        ]);
        expect(res).toEqual([withdrawal]);
      });
    }
  });

  it('ignores API calls that have no requester index', () => {
    const apiCall = fixtures.requests.buildApiCall({ designatedWallet: '0xinvalid', requesterIndex: null });
    const [logs, res] = verification.verifyDesignatedWallets([apiCall], masterHDNode);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Ignoring Request:${apiCall.id} as no requester index could be found for designated wallet verification`,
      },
    ]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.TemplateNotFound });
  });

  it('ignores API calls where the designated wallet does not match the expected address', () => {
    const apiCall = fixtures.requests.buildApiCall({ designatedWallet: '0xinvalid', requesterIndex: '3' });
    const [logs, res] = verification.verifyDesignatedWallets([apiCall], masterHDNode);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Invalid designated wallet:${apiCall.designatedWallet} for Request:${apiCall.id}. Expected:0x2EfDDdd9337999A00f36f28e58F036381B8b1125`,
      },
    ]);
    expect(res[0]).toEqual({
      ...apiCall,
      status: RequestStatus.Ignored,
      errorCode: RequestErrorCode.DesignatedWalletInvalid,
    });
  });

  it('does nothing if the designated wallet matches the expected wallet', () => {
    const apiCall = fixtures.requests.buildApiCall({
      designatedWallet: '0x2EfDDdd9337999A00f36f28e58F036381B8b1125',
      requesterIndex: '3',
    });
    const [logs, res] = verification.verifyDesignatedWallets([apiCall], masterHDNode);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${apiCall.id} is linked to a valid designated wallet:0x2EfDDdd9337999A00f36f28e58F036381B8b1125`,
      },
    ]);
    expect(res[0]).toEqual(apiCall);
  });
});
