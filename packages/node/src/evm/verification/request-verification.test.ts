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
          status: RequestStatus[status as RequestStatus],
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
        const withdrawal = fixtures.requests.buildWithdrawal({
          designatedWallet: '0xinvalid',
          status: RequestStatus[status as RequestStatus],
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

  it('ignores API calls where the designated wallet does not match the expected address', () => {
    const apiCall = fixtures.requests.buildApiCall({ designatedWallet: '0xinvalid', requesterIndex: '3' });
    const [logs, res] = verification.verifyDesignatedWallets([apiCall], masterHDNode);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Invalid designated wallet:${apiCall.designatedWallet} for Request:${apiCall.id}. Expected:0x2EfDDdd9337999A00f36f28e58F036381B8b1125`,
      },
    ]);
    expect(res.length).toEqual(1);
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
    expect(res.length).toEqual(1);
    expect(res[0]).toEqual(apiCall);
  });
});

describe('verifyTriggers', () => {
  requests.getStatusNames().forEach((status) => {
    if (status !== 'Pending') {
      it(`returns API calls that have status: ${status}`, () => {
        const apiCall = fixtures.requests.buildApiCall({
          endpointId: '0xinvalid',
          status: RequestStatus[status as RequestStatus],
        });
        const config = fixtures.buildConfig();
        const triggers = config.triggers.request;
        const [logs, res] = verification.verifyTriggers([apiCall], triggers, config.ois);
        expect(logs).toEqual([
          {
            level: 'DEBUG',
            message: `Trigger verification skipped for Request:${apiCall.id} as it has status:${apiCall.status}`,
          },
        ]);
        expect(res).toEqual([apiCall]);
      });
    }
  });

  it('errors API calls that have an unknown endpointId', () => {
    const apiCall = fixtures.requests.buildApiCall({ endpointId: '0xinvalid' });
    const config = fixtures.buildConfig();
    const triggers = config.triggers.request;
    const [logs, res] = verification.verifyTriggers([apiCall], triggers, config.ois);
    expect(logs).toEqual([
      {
        level: 'WARN',
        message: `Request:${apiCall.id} has no matching endpointId:${apiCall.endpointId} in Airnode config`,
      },
    ]);
    expect(res.length).toEqual(1);
    expect(res[0]).toEqual({
      ...apiCall,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.UnknownEndpointId,
    });
  });

  it('errors API calls that are linked to a valid trigger but unknown OIS', () => {
    const trigger = fixtures.buildTrigger({ oisTitle: 'unknown' });
    const apiCall = fixtures.requests.buildApiCall({ endpointId: trigger.endpointId });
    const config = fixtures.buildConfig({ triggers: { request: [trigger] } });
    const [logs, res] = verification.verifyTriggers([apiCall], [trigger], config.ois);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Unknown OIS:unknown received for Request:${apiCall.id}`,
      },
    ]);
    expect(res.length).toEqual(1);
    expect(res[0]).toEqual({
      ...apiCall,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.UnknownOIS,
    });
  });

  it('errors API calls that are linked to a valid trigger but unknown endpoint', () => {
    const trigger = fixtures.buildTrigger({ endpointName: 'unknown' });
    const apiCall = fixtures.requests.buildApiCall({ endpointId: trigger.endpointId });
    const config = fixtures.buildConfig({ triggers: { request: [trigger] } });
    const [logs, res] = verification.verifyTriggers([apiCall], [trigger], config.ois);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Unknown Endpoint:unknown for OIS:${trigger.oisTitle} received for Request:${apiCall.id}`,
      },
    ]);
    expect(res.length).toEqual(1);
    expect(res[0]).toEqual({
      ...apiCall,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.UnknownOIS,
    });
  });

  it('does nothing is the API call is linked to a valid trigger and OIS endpoint', () => {
    const trigger = fixtures.buildTrigger();
    const apiCall = fixtures.requests.buildApiCall({ endpointId: trigger.endpointId });
    const config = fixtures.buildConfig({ triggers: { request: [trigger] } });
    const [logs, res] = verification.verifyTriggers([apiCall], [trigger], config.ois);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${apiCall.id} is linked to a valid endpointId:${apiCall.endpointId}`,
      },
    ]);
    expect(res).toEqual([apiCall]);
  });
});
