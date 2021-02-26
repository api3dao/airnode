import * as fixtures from 'test/fixtures';
import { GroupedRequests, RequestErrorCode, RequestStatus } from 'src/types';
import * as blocking from './blocking';

describe('blockRequestsWithWithdrawals', () => {
  it('blocks API calls with pending withdrawals from the same wallet index', () => {
    const apiCall = fixtures.requests.buildApiCall({ requesterIndex: '123' });
    const withdrawal = fixtures.requests.createWithdrawal({ requesterIndex: '123' });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [withdrawal],
    };
    const [logs, res] = blocking.blockRequestsWithWithdrawals(requests);
    expect(logs).toEqual([
      { level: 'WARN', message: `Ignoring Request ID:${apiCall.id} as it has a pending Withdrawl ID:${withdrawal.id}` },
    ]);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0].status).toEqual(RequestStatus.Ignored);
    expect(res.apiCalls[0].errorCode).toEqual(RequestErrorCode.PendingWithdrawal);
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].status).toEqual(RequestStatus.Pending);
  });

  it('does nothing if API call and withdrawal wallet indices do not match', () => {
    const apiCall = fixtures.requests.buildApiCall({ requesterIndex: '123' });
    const withdrawal = fixtures.requests.createWithdrawal({ requesterIndex: '456' });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [withdrawal],
    };
    const [logs, res] = blocking.blockRequestsWithWithdrawals(requests);
    expect(logs).toEqual([]);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0].id).toEqual(apiCall.id);
    expect(res.apiCalls[0].status).toEqual(RequestStatus.Pending);
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].id).toEqual(withdrawal.id);
    expect(res.withdrawals[0].status).toEqual(RequestStatus.Pending);
  });

  it('does not block API calls linked to non-pending withdrawals', () => {
    const requesterIndex = '123';
    const apiCall = fixtures.requests.buildApiCall({ requesterIndex });
    const statuses = Object.keys(RequestStatus).filter((status) => RequestStatus[status] !== RequestStatus.Pending);
    const withdrawals = statuses.map((status) => {
      return fixtures.requests.createWithdrawal({ status: RequestStatus[status], requesterIndex });
    });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals,
    };
    const [logs, res] = blocking.blockRequestsWithWithdrawals(requests);
    expect(logs).toEqual([]);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0].status).toEqual(RequestStatus.Pending);
  });
});
