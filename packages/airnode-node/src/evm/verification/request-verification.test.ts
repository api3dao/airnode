import * as verification from './request-verification';
import * as wallet from '../wallet';
import * as fixtures from '../../../test/fixtures';

describe('verifySponsorWallets', () => {
  const config = fixtures.buildConfig();
  const masterHDNode = wallet.getMasterHDNode(config);

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
    const [apiCalllogs, verifiedApiCalls] = verification.verifySponsorWallets(
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
    expect(verifiedApiCalls.length).toEqual(0);

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
    expect(withdrawals.length).toEqual(0);
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
  it('drops API calls that have an unknown endpointId', () => {
    const apiCall = fixtures.requests.buildApiCall({ endpointId: '0xinvalid' });
    const config = fixtures.buildConfig();
    const rrpTriggers = config.triggers.rrp;
    const [logs, res] = verification.verifyRrpTriggers([apiCall], rrpTriggers);
    expect(logs).toEqual([
      {
        level: 'WARN',
        message: `Request:${apiCall.id} has no matching endpointId:${apiCall.endpointId} in Airnode config`,
      },
    ]);
    expect(res.length).toEqual(0);
  });

  it('does nothing if the API call is linked to a valid trigger and OIS endpoint', () => {
    const rrpTrigger = fixtures.buildRrpTrigger();
    const apiCall = fixtures.requests.buildApiCall({ endpointId: rrpTrigger.endpointId });
    const [logs, res] = verification.verifyRrpTriggers([apiCall], [rrpTrigger]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${apiCall.id} is linked to a valid endpointId:${apiCall.endpointId}`,
      },
    ]);
    expect(res).toEqual([apiCall]);
  });
});
