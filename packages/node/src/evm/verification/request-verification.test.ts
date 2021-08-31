import * as verification from './request-verification';
import * as requests from '../../requests';
import * as wallet from '../wallet';
import * as fixtures from '../../../test/fixtures';
import { RequestErrorCode, RequestStatus } from '../../types';

describe('verifySponsorWallets', () => {
  const masterHDNode = wallet.getMasterHDNode(config);

  requests.getStatusNames().forEach((status) => {
    if (status !== 'Pending') {
      it(`returns API calls that have status: ${status}`, () => {
        const apiCall = fixtures.requests.buildApiCall({
          sponsorWallet: '0xinvalid',
          status: RequestStatus[status as RequestStatus],
        });
        const [logs, res] = verification.verifySponsorWallets([apiCall], masterHDNode);
        expect(logs).toEqual([
          {
            level: 'DEBUG',
            message: `Sponsor wallet verification skipped for Request:${apiCall.id} as it has status:${apiCall.status}`,
          },
        ]);
        expect(res).toEqual([apiCall]);
      });

      it(`returns withdrawals that have status: ${status}`, () => {
        const withdrawal = fixtures.requests.buildWithdrawal({
          sponsorWallet: '0xinvalid',
          status: RequestStatus[status as RequestStatus],
        });
        const [logs, res] = verification.verifySponsorWallets([withdrawal], masterHDNode);
        expect(logs).toEqual([
          {
            level: 'DEBUG',
            message: `Sponsor wallet verification skipped for Request:${withdrawal.id} as it has status:${withdrawal.status}`,
          },
        ]);
        expect(res).toEqual([withdrawal]);
      });
    }
  });

  it('ignores API calls where the sponsor wallet does not match the expected address', () => {
    const apiCall = fixtures.requests.buildApiCall({
      sponsorWallet: '0xinvalid',
      sponsorAddress: '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6',
    });
    const [logs, res] = verification.verifySponsorWallets([apiCall], masterHDNode);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Invalid sponsor wallet:${apiCall.sponsorWallet} for Request:${apiCall.id}. Expected:0x4F716a9a20D03be77753F3D3e856a5e180995Eda`,
      },
    ]);
    expect(res.length).toEqual(1);
    expect(res[0]).toEqual({
      ...apiCall,
      status: RequestStatus.Ignored,
      errorCode: RequestErrorCode.SponsorWalletInvalid,
    });
  });

  it('does nothing if the sponsor wallet matches the expected wallet', () => {
    const apiCall = fixtures.requests.buildApiCall({
      sponsorWallet: '0x4F716a9a20D03be77753F3D3e856a5e180995Eda',
      sponsorAddress: '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6',
    });
    const [logs, res] = verification.verifySponsorWallets([apiCall], masterHDNode);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${apiCall.id} is linked to a valid sponsor wallet:0x4F716a9a20D03be77753F3D3e856a5e180995Eda`,
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
        const rrpTriggers = config.triggers.rrp;
        const [logs, res] = verification.verifyRrpTriggers([apiCall], rrpTriggers, config.ois);
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
    const rrpTriggers = config.triggers.rrp;
    const [logs, res] = verification.verifyRrpTriggers([apiCall], rrpTriggers, config.ois);
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
    const rrpTrigger = fixtures.buildRrpTrigger({ oisTitle: 'unknown' });
    const apiCall = fixtures.requests.buildApiCall({ endpointId: rrpTrigger.endpointId });
    const config = fixtures.buildConfig({ triggers: { rrp: [rrpTrigger] } });
    const [logs, res] = verification.verifyRrpTriggers([apiCall], [rrpTrigger], config.ois);
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
    const rrpTrigger = fixtures.buildRrpTrigger({ endpointName: 'unknown' });
    const apiCall = fixtures.requests.buildApiCall({ endpointId: rrpTrigger.endpointId });
    const config = fixtures.buildConfig({ triggers: { rrp: [rrpTrigger] } });
    const [logs, res] = verification.verifyRrpTriggers([apiCall], [rrpTrigger], config.ois);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Unknown Endpoint:unknown for OIS:${rrpTrigger.oisTitle} received for Request:${apiCall.id}`,
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
    const rrpTrigger = fixtures.buildRrpTrigger();
    const apiCall = fixtures.requests.buildApiCall({ endpointId: rrpTrigger.endpointId });
    const config = fixtures.buildConfig({ triggers: { rrp: [rrpTrigger] } });
    const [logs, res] = verification.verifyRrpTriggers([apiCall], [rrpTrigger], config.ois);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${apiCall.id} is linked to a valid endpointId:${apiCall.endpointId}`,
      },
    ]);
    expect(res).toEqual([apiCall]);
  });
});
