jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as fixtures from 'test/fixtures';
import * as requests from '../../requests';
import * as verification from './request-verification';
import { RequestErrorCode, RequestStatus } from 'src/types';

describe('verifyDesignatedWallets', () => {
  requests.getStatusNames().forEach((status) => {
    if (status !== 'Pending') {
      it(`returns API calls that have status: ${status}`, () => {
        const apiCall = fixtures.requests.createApiCall({
          designatedWallet: '0xinvalid',
          status: RequestStatus[status],
        });
        const [logs, res] = verification.verifyDesignatedWallets([apiCall]);
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
        const [logs, res] = verification.verifyDesignatedWallets([withdrawal]);
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
    const apiCall = fixtures.requests.createApiCall({ designatedWallet: '0xinvalid', requesterIndex: null });
    const [logs, res] = verification.verifyDesignatedWallets([apiCall]);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Ignoring Request:${apiCall.id} as no requester index could be found for designated wallet verification`,
      },
    ]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.TemplateNotFound });
  });

  it('ignores API calls where the designated wallet does not match the expected address', () => {
    const apiCall = fixtures.requests.createApiCall({ designatedWallet: '0xinvalid', requesterIndex: '3' });
    const [logs, res] = verification.verifyDesignatedWallets([apiCall]);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Invalid designated wallet:${apiCall.designatedWallet} for Request:${apiCall.id}. Expected:0xdEc1ef92C1c1C5C84Ae0aF715745E691071Cb4fa`,
      },
    ]);
    expect(res[0]).toEqual({
      ...apiCall,
      status: RequestStatus.Ignored,
      errorCode: RequestErrorCode.InvalidDesignatedWallet,
    });
  });

  it('does nothing if the designated wallet matches the expected wallet', () => {
    const apiCall = fixtures.requests.createApiCall({
      designatedWallet: '0xdEc1ef92C1c1C5C84Ae0aF715745E691071Cb4fa',
      requesterIndex: '3',
    });
    const [logs, res] = verification.verifyDesignatedWallets([apiCall]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${apiCall.id} is linked to a valid designated wallet:0xdEc1ef92C1c1C5C84Ae0aF715745E691071Cb4fa`,
      },
    ]);
    expect(res[0]).toEqual(apiCall);
  });
});
