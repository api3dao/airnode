import * as fixtures from 'test/fixtures';
import * as request from './request';
import { GroupedRequests, RequestErrorCode, RequestStatus } from 'src/types';

describe('filterActionableApiCalls', () => {
  it('returns actionable API calls', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ status: RequestStatus.Pending }),
      fixtures.requests.createApiCall({ status: RequestStatus.Errored }),
      fixtures.requests.createApiCall({ status: RequestStatus.Ignored }),
      fixtures.requests.createApiCall({ status: RequestStatus.Blocked }),
      fixtures.requests.createApiCall({ status: RequestStatus.Fulfilled }),
    ];
    expect(request.filterActionableApiCalls(apiCalls)).toEqual([
      fixtures.requests.createApiCall({ status: RequestStatus.Pending }),
      fixtures.requests.createApiCall({ status: RequestStatus.Errored }),
    ]);
  });
});

describe('filterActionableWithdrawals', () => {
  it('returns actionable withdrawals', () => {
    const withdrawals = [
      fixtures.requests.createWithdrawal({ status: RequestStatus.Pending }),
      fixtures.requests.createWithdrawal({ status: RequestStatus.Errored }),
      fixtures.requests.createWithdrawal({ status: RequestStatus.Ignored }),
      fixtures.requests.createWithdrawal({ status: RequestStatus.Blocked }),
      fixtures.requests.createWithdrawal({ status: RequestStatus.Fulfilled }),
    ];
    expect(request.filterActionableWithdrawals(withdrawals)).toEqual([
      fixtures.requests.createWithdrawal({ status: RequestStatus.Pending }),
    ]);
  });
});

describe('hasActionableApiCalls', () => {
  it('returns true if pending API calls are present', () => {
    const apiCalls = [fixtures.requests.createApiCall({ status: RequestStatus.Pending })];
    expect(request.hasActionableApiCalls(apiCalls)).toEqual(true);
  });

  it('returns true if errored API calls are present', () => {
    const apiCalls = [fixtures.requests.createApiCall({ status: RequestStatus.Errored })];
    expect(request.hasActionableApiCalls(apiCalls)).toEqual(true);
  });

  it('returns false if there are no pending or errored API calls', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ status: RequestStatus.Ignored }),
      fixtures.requests.createApiCall({ status: RequestStatus.Blocked }),
      fixtures.requests.createApiCall({ status: RequestStatus.Fulfilled }),
    ];
    expect(request.hasActionableApiCalls(apiCalls)).toEqual(false);
  });

  it('returns false if there are no API calls', () => {
    expect(request.hasActionableApiCalls([])).toEqual(false);
  });
});

describe('hasActionableWithdrawals', () => {
  it('returns true if pending withdrawals are present', () => {
    const withdrawals = [fixtures.requests.createWithdrawal({ status: RequestStatus.Pending })];
    expect(request.hasActionableWithdrawals(withdrawals)).toEqual(true);
  });

  it('returns false if there are no pending withdrawals', () => {
    const withdrawals = [
      fixtures.requests.createWithdrawal({ status: RequestStatus.Errored }),
      fixtures.requests.createWithdrawal({ status: RequestStatus.Ignored }),
      fixtures.requests.createWithdrawal({ status: RequestStatus.Blocked }),
      fixtures.requests.createWithdrawal({ status: RequestStatus.Fulfilled }),
    ];
    expect(request.hasActionableWithdrawals(withdrawals)).toEqual(false);
  });

  it('returns false if there are no withdrawals', () => {
    expect(request.hasActionableWithdrawals([])).toEqual(false);
  });
});

describe('hasNoActionableRequests', () => {
  it('returns false if actionable API calls are present', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ status: RequestStatus.Pending })],
      withdrawals: [],
    };
    expect(request.hasNoActionableRequests(requests)).toEqual(false);
  });

  it('returns false if actionable withdrawals are present', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ status: RequestStatus.Errored })],
      withdrawals: [],
    };
    expect(request.hasNoActionableRequests(requests)).toEqual(false);
  });

  it('returns true if there are no actionable API calls or withdrawals', () => {
    const requests: GroupedRequests = {
      apiCalls: [
        fixtures.requests.createApiCall({ status: RequestStatus.Ignored }),
        fixtures.requests.createApiCall({ status: RequestStatus.Blocked }),
        fixtures.requests.createApiCall({ status: RequestStatus.Fulfilled }),
      ],
      withdrawals: [
        fixtures.requests.createWithdrawal({ status: RequestStatus.Errored }),
        fixtures.requests.createWithdrawal({ status: RequestStatus.Ignored }),
        fixtures.requests.createWithdrawal({ status: RequestStatus.Blocked }),
        fixtures.requests.createWithdrawal({ status: RequestStatus.Fulfilled }),
      ],
    };
    expect(request.hasNoActionableRequests(requests)).toEqual(true);
  });

  it('returns true if no requests are present', () => {
    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: [],
    };
    expect(request.hasNoActionableRequests(requests)).toEqual(true);
  });

  it('returns true if there are no requests present', () => {
    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: [],
    };
    expect(request.hasNoActionableRequests(requests)).toEqual(true);
  });
});

describe('getStatusNames', () => {
  it('returns a list of all status names', () => {
    expect(request.getStatusNames()).toEqual(['Pending', 'Fulfilled', 'Ignored', 'Blocked', 'Errored']);
  });
});

describe('getErrorCode', () => {
  it('returns the error code for the request', () => {
    const apiCall = fixtures.requests.createApiCall({ errorCode: RequestErrorCode.TemplateNotFound });
    expect(request.getErrorCode(apiCall)).toEqual(RequestErrorCode.TemplateNotFound);
  });

  it('returns 0 if no error code is present', () => {
    const apiCall = fixtures.requests.createApiCall({ errorCode: undefined });
    expect(request.getErrorCode(apiCall)).toEqual(0);
  });
});
