import * as fixtures from 'test/fixtures';
import { GroupedRequests, RequestErrorCode, RequestStatus } from 'src/types';
import * as validation from './validation';

describe('validation', () => {
  it('does nothing if the request is already invalid', () => {
    const requests: GroupedRequests = {
      apiCalls: [
        fixtures.requests.createApiCall({ status: RequestStatus.Blocked, errorCode: 9999 }),
        fixtures.requests.createApiCall({ status: RequestStatus.Errored, errorCode: 9999 }),
      ],
      withdrawals: [fixtures.requests.createWithdrawal({ status: RequestStatus.Errored, errorCode: 9999 })],
    };

    const [logs, res] = validation.validateRequests(requests);
    expect(logs).toEqual([]);
    expect(res.apiCalls[0].status).toEqual(RequestStatus.Blocked);
    expect(res.apiCalls[0].errorCode).toEqual(9999);
    expect(res.apiCalls[1].status).toEqual(RequestStatus.Errored);
    expect(res.apiCalls[1].errorCode).toEqual(9999);
    expect(res.withdrawals[0].status).toEqual(RequestStatus.Errored);
    expect(res.withdrawals[0].errorCode).toEqual(9999);
  });

  describe('validating API calls', () => {
    it('validates that the wallet index is not reserved', () => {
      const reserved = fixtures.requests.createApiCall({ walletIndex: '0' });
      const unreserved = fixtures.requests.createApiCall({ walletIndex: '1' });

      const requests: GroupedRequests = {
        apiCalls: [reserved, unreserved],
        withdrawals: [],
      };

      const [logs, res] = validation.validateRequests(requests);
      expect(logs).toEqual([{ level: 'ERROR', message: `Request ID:${reserved.id} has reserved wallet index 0` }]);
      expect(res.apiCalls[0].status).toEqual(RequestStatus.Errored);
      expect(res.apiCalls[0].errorCode).toEqual(RequestErrorCode.ReservedWalletIndex);
      expect(res.apiCalls[1].status).toEqual(RequestStatus.Pending);
      expect(res.apiCalls[1].errorCode).toEqual(undefined);
    });

    it('validates the current balance is greater than the minimum balance', () => {
      const sufficientBalance = fixtures.requests.createApiCall({ walletBalance: '10', walletMinimumBalance: '5' });
      const matchingBalance = fixtures.requests.createApiCall({ walletBalance: '5', walletMinimumBalance: '5' });
      const insufficientBalance = fixtures.requests.createApiCall({
        walletBalance: '20000000',
        walletMinimumBalance: '50000000',
      });

      const requests: GroupedRequests = {
        apiCalls: [sufficientBalance, matchingBalance, insufficientBalance],
        withdrawals: [],
      };

      const [logs, res] = validation.validateRequests(requests);
      expect(logs).toEqual([
        {
          level: 'ERROR',
          message: `Request ID:${insufficientBalance.id} wallet has insufficient balance of 0.00000000002 ETH. Minimum balance of 0.00000000005 ETH is required`,
        },
      ]);
      expect(res.apiCalls[0].status).toEqual(RequestStatus.Pending);
      expect(res.apiCalls[0].errorCode).toEqual(undefined);
      expect(res.apiCalls[1].status).toEqual(RequestStatus.Pending);
      expect(res.apiCalls[1].errorCode).toEqual(undefined);
      expect(res.apiCalls[2].status).toEqual(RequestStatus.Ignored);
      expect(res.apiCalls[2].errorCode).toEqual(RequestErrorCode.InsufficientBalance);
    });
  });

  describe('validating withdrawals', () => {
    it('validates the current balance is greater than the minimum balance', () => {
      const sufficientBalance = fixtures.requests.createWithdrawal({ walletBalance: '10', walletMinimumBalance: '5' });
      const matchingBalance = fixtures.requests.createWithdrawal({ walletBalance: '5', walletMinimumBalance: '5' });
      const insufficientBalance = fixtures.requests.createWithdrawal({
        walletBalance: '20000000',
        walletMinimumBalance: '50000000',
      });

      const requests: GroupedRequests = {
        apiCalls: [],
        withdrawals: [sufficientBalance, matchingBalance, insufficientBalance],
      };

      const [logs, res] = validation.validateRequests(requests);
      expect(logs).toEqual([
        {
          level: 'ERROR',
          message: `Request ID:${insufficientBalance.id} wallet has insufficient balance of 0.00000000002 ETH. Minimum balance of 0.00000000005 ETH is required`,
        },
      ]);
      expect(res.withdrawals[0].status).toEqual(RequestStatus.Pending);
      expect(res.withdrawals[0].errorCode).toEqual(undefined);
      expect(res.withdrawals[1].status).toEqual(RequestStatus.Pending);
      expect(res.withdrawals[1].errorCode).toEqual(undefined);
      expect(res.withdrawals[2].status).toEqual(RequestStatus.Ignored);
      expect(res.withdrawals[2].errorCode).toEqual(RequestErrorCode.InsufficientBalance);
    });
  });
});
