import * as verification from './request-verification';
import * as requests from '../../requests';
import * as wallet from '../wallet';
import * as fixtures from '../../../test/fixtures';
import { RequestErrorMessage, RequestStatus } from '../../types';

describe('verifySponsorWallets', () => {
  const config = fixtures.buildConfig();
  const masterHDNode = wallet.getMasterHDNode(config);

  requests.getStatusNames().forEach((status) => {
    if (status !== 'Pending') {
      it(`returns API calls that have status: ${status}`, () => {
        const apiCall = fixtures.requests.buildApiCall({
          sponsorWalletAddress: '0xinvalid',
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
          sponsorWalletAddress: '0xinvalid',
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
    const invalidSponsorWallet = {
      sponsorWalletAddress: '0xinvalid',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    };
    const sponsorWalletDoesNotBelongToSponsor = {
      sponsorWalletAddress: '0x927c6353B05dD326f922BB28e8282d591278CDfa',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    };
    const invalidApiCall = fixtures.requests.buildApiCall(invalidSponsorWallet);
    const doNotMatchApiCall = fixtures.requests.buildApiCall(sponsorWalletDoesNotBelongToSponsor);
    const [apiCalllogs, verifiesdApiCalls] = verification.verifySponsorWallets(
      [invalidApiCall, doNotMatchApiCall],
      masterHDNode
    );
    expect(apiCalllogs).toEqual([
      {
        level: 'ERROR',
        message: `Invalid sponsor wallet:${invalidApiCall.sponsorWalletAddress} for Request:${invalidApiCall.id}. Expected:0xdBFe14C250643DEFE92C9AbC52103bf4978C7113`,
      },
      {
        level: 'ERROR',
        message: `Invalid sponsor wallet:${doNotMatchApiCall.sponsorWalletAddress} for Request:${doNotMatchApiCall.id}. Expected:0xdBFe14C250643DEFE92C9AbC52103bf4978C7113`,
      },
    ]);
    expect(verifiesdApiCalls.length).toEqual(2);
    expect(verifiesdApiCalls).toEqual([
      {
        ...invalidApiCall,
        status: RequestStatus.Ignored,
        errorMessage: `${RequestErrorMessage.SponsorWalletInvalid}: ${invalidApiCall.sponsorWalletAddress}`,
      },
      {
        ...doNotMatchApiCall,
        status: RequestStatus.Ignored,
        errorMessage: `${RequestErrorMessage.SponsorWalletInvalid}: ${doNotMatchApiCall.sponsorWalletAddress}`,
      },
    ]);

    const invalidWithdrawal = fixtures.requests.buildWithdrawal(invalidSponsorWallet);
    const doNotMatchWithdrawal = fixtures.requests.buildWithdrawal(sponsorWalletDoesNotBelongToSponsor);
    const [withdrawalLogs, withdrawals] = verification.verifySponsorWallets(
      [invalidWithdrawal, doNotMatchWithdrawal],
      masterHDNode
    );
    expect(withdrawalLogs).toEqual([
      {
        level: 'ERROR',
        message: `Invalid sponsor wallet:${invalidWithdrawal.sponsorWalletAddress} for Request:${invalidWithdrawal.id}. Expected:0xdBFe14C250643DEFE92C9AbC52103bf4978C7113`,
      },
      {
        level: 'ERROR',
        message: `Invalid sponsor wallet:${doNotMatchWithdrawal.sponsorWalletAddress} for Request:${doNotMatchWithdrawal.id}. Expected:0xdBFe14C250643DEFE92C9AbC52103bf4978C7113`,
      },
    ]);
    expect(withdrawals.length).toEqual(2);
    expect(withdrawals).toEqual([
      {
        ...invalidWithdrawal,
        status: RequestStatus.Ignored,
        errorMessage: `${RequestErrorMessage.SponsorWalletInvalid}: ${invalidWithdrawal.sponsorWalletAddress}`,
      },
      {
        ...doNotMatchWithdrawal,
        status: RequestStatus.Ignored,
        errorMessage: `${RequestErrorMessage.SponsorWalletInvalid}: ${doNotMatchApiCall.sponsorWalletAddress}`,
      },
    ]);
  });

  it('does nothing if the sponsor wallet matches the expected wallet', () => {
    const apiCall = fixtures.requests.buildApiCall({
      sponsorWalletAddress: '0xdBFe14C250643DEFE92C9AbC52103bf4978C7113',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });
    const [apiCallLogs, apiCalls] = verification.verifySponsorWallets([apiCall], masterHDNode);
    expect(apiCallLogs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${apiCall.id} is linked to a valid sponsor wallet:0xdBFe14C250643DEFE92C9AbC52103bf4978C7113`,
      },
    ]);
    expect(apiCalls.length).toEqual(1);
    expect(apiCalls[0]).toEqual(apiCall);

    const withdrawal = fixtures.requests.buildWithdrawal({
      sponsorWalletAddress: '0xdBFe14C250643DEFE92C9AbC52103bf4978C7113',
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });
    const [withdrawalLogs, withdrawals] = verification.verifySponsorWallets([withdrawal], masterHDNode);
    expect(withdrawalLogs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${withdrawal.id} is linked to a valid sponsor wallet:0xdBFe14C250643DEFE92C9AbC52103bf4978C7113`,
      },
    ]);
    expect(withdrawals.length).toEqual(1);
    expect(withdrawals[0]).toEqual(withdrawal);
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
      errorMessage: `${RequestErrorMessage.UnknownEndpointId}: ${apiCall.endpointId}`,
    });
  });

  it('errors API calls that are linked to a valid trigger but unknown OIS', () => {
    const rrpTrigger = fixtures.buildTrigger({ oisTitle: 'unknown' });
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
      errorMessage: `${RequestErrorMessage.UnknownOIS}: ${rrpTrigger.oisTitle}`,
    });
  });

  it('errors API calls that are linked to a valid trigger but unknown endpoint', () => {
    const rrpTrigger = fixtures.buildTrigger({ endpointName: 'unknown' });
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
      errorMessage: `${RequestErrorMessage.UnknownEndpointName}: ${rrpTrigger.endpointName} for OIS ${rrpTrigger.oisTitle}`,
    });
  });

  it('does nothing is the API call is linked to a valid trigger and OIS endpoint', () => {
    const rrpTrigger = fixtures.buildTrigger();
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
